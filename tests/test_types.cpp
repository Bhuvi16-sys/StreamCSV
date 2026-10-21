#include <streamcsv/error.hpp>
#include <streamcsv/record.hpp>

#include <cassert>
#include <iostream>
#include <memory>
#include <stdexcept>
#include <string>
#include <vector>

static void test_record_basics() {
    streamcsv::Record r1;
    assert(r1.empty());
    assert(r1.size() == 0);
    assert(r1.line_number() == 0);

    r1.set_line_number(42);
    assert(r1.line_number() == 42);

    r1.add_field("apple");
    r1.add_field("banana");
    assert(!r1.empty());
    assert(r1.size() == 2);
    assert(r1[0] == "apple");
    assert(r1[1] == "banana");
    assert(r1.at(0) == "apple");
    assert(r1.at(1) == "banana");

    // Bounds checking
    bool out_of_range_caught = false;
    try {
        (void)r1.at(2);
    } catch (const std::out_of_range&) {
        out_of_range_caught = true;
    }
    assert(out_of_range_caught);
}

static void test_record_equality_and_init_list() {
    streamcsv::Record r1({"col1", "col2", "col3"}, 10);
    streamcsv::Record r2({"col1", "col2", "col3"}, 10);
    streamcsv::Record r3({"col1", "col2", "diff"}, 10);
    streamcsv::Record r4({"col1", "col2", "col3"}, 11);

    assert(r1 == r2);
    assert(r1 != r3);
    assert(r1 != r4);

    // Iteration
    std::string concatenated;
    for (const auto& field : r1) {
        concatenated += field + ",";
    }
    assert(concatenated == "col1,col2,col3,");
}

static void test_record_typed_getters() {
    streamcsv::Record r({"42", "-17", "3.1415", "true", "FALSE", "hello world", ""});

    // Valid conversions
    assert(r.get<int>(0) == 42);
    assert(r.get<long long>(0) == 42LL);
    assert(r.get<int>(1) == -17);
    assert(r.get<double>(2) > 3.14 && r.get<double>(2) < 3.15);
    assert(r.get<float>(2) > 3.14f && r.get<float>(2) < 3.15f);
    assert(r.get<bool>(3) == true);
    assert(r.get<bool>(4) == false);
    assert(r.get<std::string>(5) == "hello world");
    assert(r.get<std::string_view>(5) == "hello world");

    // Optional getters
    assert(r.get_optional<int>(0) == 42);
    assert(!r.get_optional<int>(5).has_value()); // "hello world" cannot convert to int
    assert(!r.get_optional<int>(6).has_value()); // empty field
    assert(!r.get_optional<int>(99).has_value()); // out of range

    // Exceptions on invalid conversion
    bool caught_invalid = false;
    try {
        (void)r.get<int>(5);
    } catch (const std::invalid_argument&) {
        caught_invalid = true;
    }
    assert(caught_invalid);
}

static void test_record_headers() {
    auto headers = std::make_shared<const std::vector<std::string>>(
        std::vector<std::string>{"id", "username", "score", "active"}
    );

    streamcsv::Record r({"101", "alice", "99.5", "yes"});
    r.set_headers(headers);

    assert(r.has_headers());
    assert(r.headers().size() == 4);
    assert(r["username"] == "alice");
    assert(r.at("score") == "99.5");
    assert(r.get<int>("id") == 101);
    assert(r.get<double>("score") > 99.4);
    assert(r.get<bool>("active") == true);

    assert(r.get_optional<int>("id") == 101);
    assert(!r.get_optional<int>("nonexistent").has_value());

    bool caught_missing_col = false;
    try {
        (void)r.at("not_in_header");
    } catch (const std::out_of_range&) {
        caught_missing_col = true;
    }
    assert(caught_missing_col);
}

static void test_error_hierarchy() {
    // Polymorphic catch as CsvError and std::runtime_error
    try {
        throw streamcsv::ParseError("Unexpected quote", 12, 5);
    } catch (const streamcsv::CsvError& e) {
        const auto* pe = dynamic_cast<const streamcsv::ParseError*>(&e);
        assert(pe != nullptr);
        assert(pe->line() == 12);
        assert(pe->column() == 5);
        assert(pe->raw_message() == "Unexpected quote");
        std::string what_str = pe->what();
        assert(what_str.find("line 12") != std::string::npos);
        assert(what_str.find("column 5") != std::string::npos);
    }

    // LimitError
    try {
        throw streamcsv::LimitError("Field too large", 100, 1);
    } catch (const streamcsv::CsvError& e) {
        const auto* le = dynamic_cast<const streamcsv::LimitError*>(&e);
        assert(le != nullptr);
        assert(le->line() == 100);
        assert(le->column() == 1);
    }

    // IoError
    try {
        throw streamcsv::IoError("File not found");
    } catch (const streamcsv::CsvError& e) {
        std::string msg = e.what();
        assert(msg.find("File not found") != std::string::npos);
    }

    // ValidationError
    try {
        throw streamcsv::ValidationError("Schema mismatch");
    } catch (const streamcsv::CsvError& e) {
        std::string msg = e.what();
        assert(msg.find("Schema mismatch") != std::string::npos);
    }
}

int main() {
    std::cout << "Running test_types (Phase 1 validation & typed accessors)...\n";
    test_record_basics();
    test_record_equality_and_init_list();
    test_record_typed_getters();
    test_record_headers();
    test_error_hierarchy();
    std::cout << "test_types PASSED! Phase 1 foundation & typed accessors rock solid.\n";
    return 0;
}

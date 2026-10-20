#include <streamcsv/error.hpp>
#include <streamcsv/record.hpp>

#include <cassert>
#include <iostream>
#include <stdexcept>
#include <string>

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
    std::cout << "Running test_types (Phase 1 validation)...\n";
    test_record_basics();
    test_record_equality_and_init_list();
    test_error_hierarchy();
    std::cout << "test_types PASSED! Phase 1 foundation is rock solid.\n";
    return 0;
}

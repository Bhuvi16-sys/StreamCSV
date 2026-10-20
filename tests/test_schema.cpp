#include <streamcsv/csv.hpp>

#include <cassert>
#include <iostream>
#include <vector>

static void test_schema_valid() {
    streamcsv::Schema schema({
        {"id", streamcsv::ColumnType::Integer, true},
        {"name", streamcsv::ColumnType::String, true},
        {"score", streamcsv::ColumnType::Float, false},
        {"active", streamcsv::ColumnType::Boolean, true}
    });

    streamcsv::Validator validator(schema);

    streamcsv::Record r1({"101", "Alice", "98.5", "true"});
    assert(validator.is_valid(r1));

    streamcsv::Record r2({"102", "Bob", "", "0"});
    assert(validator.is_valid(r2));
}

static void test_schema_invalid_type() {
    streamcsv::Schema schema({
        {"id", streamcsv::ColumnType::Integer, true},
        {"active", streamcsv::ColumnType::Boolean, true}
    });

    streamcsv::Validator validator(schema);

    streamcsv::Record invalid_id({"not_a_number", "true"});
    auto issues1 = validator.validate_record(invalid_id);
    assert(!issues1.empty());

    streamcsv::Record invalid_bool({"101", "not_a_bool"});
    auto issues2 = validator.validate_record(invalid_bool);
    assert(!issues2.empty());
}

static void test_schema_field_count_mismatch() {
    streamcsv::Schema schema({
        {"c1", streamcsv::ColumnType::String, true},
        {"c2", streamcsv::ColumnType::String, true}
    });

    streamcsv::Validator validator(schema);

    streamcsv::Record short_record({"only_one"});
    auto issues = validator.validate_record(short_record);
    assert(!issues.empty());
}

int main() {
    std::cout << "Running test_schema...\n";
    test_schema_valid();
    test_schema_invalid_type();
    test_schema_field_count_mismatch();
    std::cout << "test_schema PASSED!\n";
    return 0;
}

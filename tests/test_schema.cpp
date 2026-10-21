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

    streamcsv::Record long_record({"one", "two", "three"});
    auto issues_long = validator.validate_record(long_record);
    assert(!issues_long.empty());
}

static void test_numeric_and_boolean_formats() {
    streamcsv::Schema schema({
        {"int_col", streamcsv::ColumnType::Integer, true},
        {"float_col", streamcsv::ColumnType::Float, true},
        {"bool_col", streamcsv::ColumnType::Boolean, true}
    });
    streamcsv::Validator validator(schema);

    // Negative integer, scientific float, mixed-case boolean
    streamcsv::Record r1({"-42", "1.25e-3", "True"});
    assert(validator.is_valid(r1));

    // Explicit plus sign
    streamcsv::Record r2({"+99", "-0.005", "yes"});
    assert(validator.is_valid(r2));

    // Malformed float
    streamcsv::Record r_bad_float({"1", "1.2.3", "false"});
    assert(!validator.is_valid(r_bad_float));

    // Malformed integer with letter
    streamcsv::Record r_bad_int({"123a", "1.0", "false"});
    assert(!validator.is_valid(r_bad_int));
}

static void test_custom_validation_rule() {
    // Country code must be exactly 2 characters
    streamcsv::Column country_col(
        "country_code",
        streamcsv::ColumnType::String,
        true,
        [](const std::string& val) { return val.size() == 2; },
        "Country code must be exactly 2 characters"
    );

    streamcsv::Schema schema({country_col});
    streamcsv::Validator validator(schema);

    streamcsv::Record valid_record({"US"});
    assert(validator.is_valid(valid_record));

    streamcsv::Record invalid_record({"USA"});
    auto issues = validator.validate_record(invalid_record);
    assert(!issues.empty());
    assert(issues[0].message == "Country code must be exactly 2 characters");
}

static void test_column_name_lookup() {
    streamcsv::Schema schema({
        {"user_id", streamcsv::ColumnType::Integer, true},
        {"email", streamcsv::ColumnType::String, true}
    });

    assert(schema.find_index("user_id") == 0);
    assert(schema.find_index("email") == 1);
    assert(!schema.find_index("nonexistent").has_value());

    const auto* col = schema.find_column("email");
    assert(col != nullptr);
    assert(col->type == streamcsv::ColumnType::String);
    assert(schema.find_column("missing") == nullptr);
}

int main() {
    std::cout << "Running test_schema (Phase 5 validation)...\n";
    test_schema_valid();
    test_schema_invalid_type();
    test_schema_field_count_mismatch();
    test_numeric_and_boolean_formats();
    test_custom_validation_rule();
    test_column_name_lookup();
    std::cout << "test_schema PASSED! Schema and type validation layer verified.\n";
    return 0;
}

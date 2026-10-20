#include <streamcsv/csv.hpp>

#include <cassert>
#include <iostream>
#include <string>

static void test_unclosed_quote() {
    bool caught = false;
    try {
        streamcsv::Reader reader("col1,col2\n\"unclosed field,next");
        while (reader.next_record()) {}
    } catch (const streamcsv::ParseError& e) {
        caught = true;
        assert(e.line() == 2);
    }
    assert(caught);
}

static void test_stray_quote_in_unquoted_field() {
    bool caught = false;
    try {
        streamcsv::Reader reader("abc,de\"fg,hij\n");
        while (reader.next_record()) {}
    } catch (const streamcsv::ParseError& e) {
        caught = true;
        assert(e.line() == 1);
    }
    assert(caught);
}

static void test_trailing_chars_after_quote() {
    bool caught = false;
    try {
        streamcsv::Reader reader("\"quoted\"trailing,other\n");
        while (reader.next_record()) {}
    } catch (const streamcsv::ParseError& e) {
        caught = true;
        assert(e.line() == 1);
    }
    assert(caught);
}

static void test_field_size_limit() {
    bool caught = false;
    streamcsv::ReaderConfig config;
    config.max_field_size = 10; // 10 byte limit for testing

    try {
        streamcsv::Reader reader("valid,this_field_is_way_too_long_for_limit\n", config);
        while (reader.next_record()) {}
    } catch (const streamcsv::LimitError& e) {
        caught = true;
        assert(e.line() == 1);
    }
    assert(caught);
}

int main() {
    std::cout << "Running test_errors...\n";
    test_unclosed_quote();
    test_stray_quote_in_unquoted_field();
    test_trailing_chars_after_quote();
    test_field_size_limit();
    std::cout << "test_errors PASSED!\n";
    return 0;
}

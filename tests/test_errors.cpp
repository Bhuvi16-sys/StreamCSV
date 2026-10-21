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

static void test_multiline_unclosed_quote_reports_start_line() {
    // Quote starts on line 2, spans lines 3 and 4, hits EOF on line 4
    std::string data = "h1,h2\n\"start on line 2\nline 3\nline 4 with no closing quote";
    bool caught = false;
    try {
        streamcsv::Reader reader(data);
        while (reader.next_record()) {}
    } catch (const streamcsv::ParseError& e) {
        caught = true;
        // MUST report line 2 (where quote opened), NOT line 4 (where EOF was encountered)
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

static void test_record_columns_limit() {
    bool caught = false;
    streamcsv::ReaderConfig config;
    config.max_fields_per_record = 3; // Max 3 columns allowed

    try {
        streamcsv::Reader reader("c1,c2,c3,c4\n", config);
        while (reader.next_record()) {}
    } catch (const streamcsv::LimitError& e) {
        caught = true;
        assert(e.line() == 1);
    }
    assert(caught);
}

static void test_strict_vs_nonstrict_modes() {
    streamcsv::ReaderConfig nonstrict_config;
    nonstrict_config.strict = false;

    // In non-strict mode, stray quotes and characters after quotes should not throw
    streamcsv::Reader r1("a\"b,\"c\"d\n", nonstrict_config);
    auto rec = r1.next_record();
    assert(rec.has_value());
    assert(rec->size() == 2);
    assert((*rec)[0] == "a\"b");
    assert((*rec)[1] == "cd");
}

int main() {
    std::cout << "Running test_errors (Phase 3 validation)...\n";
    test_unclosed_quote();
    test_multiline_unclosed_quote_reports_start_line();
    test_stray_quote_in_unquoted_field();
    test_trailing_chars_after_quote();
    test_field_size_limit();
    test_record_columns_limit();
    test_strict_vs_nonstrict_modes();
    std::cout << "test_errors PASSED! All syntax and resource error guards verified.\n";
    return 0;
}

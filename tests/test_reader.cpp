#include <streamcsv/csv.hpp>

#include <cassert>
#include <iostream>
#include <sstream>
#include <string>

static void test_empty_input() {
    streamcsv::Reader reader("");
    auto rec = reader.next_record();
    assert(!rec.has_value());
}

static void test_simple_record() {
    streamcsv::Reader reader("first,second,third\n1,2,3");
    auto r1 = reader.next_record();
    assert(r1.has_value());
    assert(r1->size() == 3);
    assert((*r1)[0] == "first");
    assert((*r1)[1] == "second");
    assert((*r1)[2] == "third");

    auto r2 = reader.next_record();
    assert(r2.has_value());
    assert(r2->size() == 3);
    assert((*r2)[0] == "1");
    assert((*r2)[1] == "2");
    assert((*r2)[2] == "3");

    auto r3 = reader.next_record();
    assert(!r3.has_value());
}

static void test_crlf_and_lf() {
    streamcsv::Reader reader("a,b\r\nc,d\ne,f\r\n");
    auto r1 = reader.next_record();
    assert(r1 && r1->size() == 2 && (*r1)[0] == "a" && (*r1)[1] == "b");
    auto r2 = reader.next_record();
    assert(r2 && r2->size() == 2 && (*r2)[0] == "c" && (*r2)[1] == "d");
    auto r3 = reader.next_record();
    assert(r3 && r3->size() == 2 && (*r3)[0] == "e" && (*r3)[1] == "f");
    assert(!reader.next_record().has_value());
}

static void test_quoted_field_with_commas_and_newlines() {
    streamcsv::Reader reader("\"hello, world\",\"multi\nline\nfield\",simple");
    auto r1 = reader.next_record();
    assert(r1.has_value());
    assert(r1->size() == 3);
    assert((*r1)[0] == "hello, world");
    assert((*r1)[1] == "multi\nline\nfield");
    assert((*r1)[2] == "simple");
}

static void test_escaped_quotes() {
    streamcsv::Reader reader("\"he said \"\"hello\"\" to me\",yes");
    auto r1 = reader.next_record();
    assert(r1.has_value());
    assert(r1->size() == 2);
    assert((*r1)[0] == "he said \"hello\" to me");
    assert((*r1)[1] == "yes");
}

static void test_utf8_bom() {
    std::string data = "\xEF\xBB\xBFname,age\nAlice,30";
    streamcsv::Reader reader(data);
    auto r1 = reader.next_record();
    assert(r1.has_value());
    assert(r1->size() == 2);
    assert((*r1)[0] == "name");
    assert((*r1)[1] == "age");
}

static void test_trailing_comma_and_consecutive_delimiters() {
    std::string data = "a,b,\n,,,\n";
    streamcsv::Reader reader(data);

    auto r1 = reader.next_record();
    assert(r1.has_value());
    assert(r1->size() == 3);
    assert((*r1)[0] == "a");
    assert((*r1)[1] == "b");
    assert((*r1)[2] == "");

    auto r2 = reader.next_record();
    assert(r2.has_value());
    assert(r2->size() == 4);
    assert((*r2)[0] == "");
    assert((*r2)[1] == "");
    assert((*r2)[2] == "");
    assert((*r2)[3] == "");

    assert(!reader.next_record().has_value());
}

static void test_custom_delimiters() {
    // Semicolon
    streamcsv::ReaderConfig semi_config;
    semi_config.delimiter = ';';
    streamcsv::Reader semi_reader("alpha;beta;gamma\n1;2;3", semi_config);
    auto s1 = semi_reader.next_record();
    assert(s1 && s1->size() == 3 && (*s1)[0] == "alpha" && (*s1)[1] == "beta" && (*s1)[2] == "gamma");

    // Tab (TSV)
    streamcsv::ReaderConfig tsv_config;
    tsv_config.delimiter = '\t';
    streamcsv::Reader tsv_reader("col1\tcol2\nval1\tval2", tsv_config);
    auto t1 = tsv_reader.next_record();
    assert(t1 && t1->size() == 2 && (*t1)[0] == "col1" && (*t1)[1] == "col2");

    // Custom quote: single quote
    streamcsv::ReaderConfig sq_config;
    sq_config.quote = '\'';
    streamcsv::Reader sq_reader("'quoted, value',plain", sq_config);
    auto q1 = sq_reader.next_record();
    assert(q1 && q1->size() == 2 && (*q1)[0] == "quoted, value" && (*q1)[1] == "plain");
}

static void test_blank_lines_configuration() {
    std::string data = "a,b\n\n\nc,d\n";

    // Default: skip_empty_lines = true
    streamcsv::Reader r_skip(data);
    auto s1 = r_skip.next_record();
    assert(s1 && (*s1)[0] == "a");
    auto s2 = r_skip.next_record();
    assert(s2 && (*s2)[0] == "c");
    assert(!r_skip.next_record().has_value());

    // With skip_empty_lines = false
    streamcsv::ReaderConfig config_keep;
    config_keep.skip_empty_lines = false;
    streamcsv::Reader r_keep(data, config_keep);
    assert(r_keep.next_record().has_value()); // "a,b"
    auto blank1 = r_keep.next_record();
    assert(blank1.has_value() && blank1->size() == 1 && (*blank1)[0] == "");
}

static void test_trim_leading_spaces() {
    std::string data = "a,  b,   c\n";
    streamcsv::ReaderConfig config;
    config.trim_leading_spaces = true;
    streamcsv::Reader reader(data, config);

    auto r = reader.next_record();
    assert(r && r->size() == 3);
    assert((*r)[0] == "a");
    assert((*r)[1] == "b");
    assert((*r)[2] == "c");
}

static void test_reader_headers() {
    std::string csv_data = "id,name,role\n1,Alice,Dev\n2,Bob,QA";
    streamcsv::ReaderConfig config;
    config.has_header = true;
    streamcsv::Reader reader(csv_data, config);

    auto r1 = reader.next_record();
    assert(r1.has_value());
    assert(reader.has_header());
    assert(reader.header().size() == 3);
    assert(reader.header()[1] == "name");

    assert((*r1)["name"] == "Alice");
    assert(r1->get<int>("id") == 1);
    assert((*r1)["role"] == "Dev");

    auto r2 = reader.next_record();
    assert(r2.has_value());
    assert((*r2)["name"] == "Bob");
    assert(r2->get<int>("id") == 2);

    assert(!reader.next_record().has_value());
}

static void test_reader_range_for() {
    std::string csv_data = "a,1\nb,2\nc,3\n";
    streamcsv::Reader reader(csv_data);

    int count = 0;
    int sum = 0;
    for (const auto& record : reader) {
        ++count;
        sum += record.get<int>(1);
    }

    assert(count == 3);
    assert(sum == 6);
}

int main() {
    std::cout << "Running test_reader (Phase 3 validation)...\n";
    test_empty_input();
    test_simple_record();
    test_crlf_and_lf();
    test_quoted_field_with_commas_and_newlines();
    test_escaped_quotes();
    test_utf8_bom();
    test_trailing_comma_and_consecutive_delimiters();
    test_custom_delimiters();
    test_blank_lines_configuration();
    test_trim_leading_spaces();
    test_reader_headers();
    test_reader_range_for();
    std::cout << "test_reader PASSED! All DFA state machine parsing cases verified.\n";
    return 0;
}

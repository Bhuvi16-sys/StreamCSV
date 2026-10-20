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

int main() {
    std::cout << "Running test_reader...\n";
    test_empty_input();
    test_simple_record();
    test_crlf_and_lf();
    test_quoted_field_with_commas_and_newlines();
    test_escaped_quotes();
    test_utf8_bom();
    std::cout << "test_reader PASSED!\n";
    return 0;
}

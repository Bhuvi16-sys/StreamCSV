#include <streamcsv/reader.hpp>

#include <cassert>
#include <iostream>
#include <sstream>
#include <string>

static void test_empty_stream() {
    std::istringstream stream("");
    streamcsv::CharSource source(stream, 16);

    assert(source.peek() == -1);
    assert(source.get() == -1);
    assert(source.line() == 1);
    assert(source.column() == 0);
}

static void test_coordinates_tracking() {
    // "ab\ncd\r\nef\rgh"
    std::istringstream stream("ab\ncd\r\nef\rgh");
    streamcsv::CharSource source(stream, 64);

    // 'a'
    assert(source.get() == 'a');
    assert(source.line() == 1 && source.column() == 1);

    // 'b'
    assert(source.get() == 'b');
    assert(source.line() == 1 && source.column() == 2);

    // '\n' (Unix LF)
    assert(source.get() == '\n');
    assert(source.line() == 2 && source.column() == 0);

    // 'c'
    assert(source.get() == 'c');
    assert(source.line() == 2 && source.column() == 1);

    // 'd'
    assert(source.get() == 'd');
    assert(source.line() == 2 && source.column() == 2);

    // '\r' (Windows CR part of CRLF)
    assert(source.get() == '\r');
    assert(source.line() == 3 && source.column() == 0);

    // '\n' (Windows LF part of CRLF)
    assert(source.get() == '\n');
    assert(source.line() == 3 && source.column() == 0); // Must NOT increment line again

    // 'e'
    assert(source.get() == 'e');
    assert(source.line() == 3 && source.column() == 1);

    // 'f'
    assert(source.get() == 'f');
    assert(source.line() == 3 && source.column() == 2);

    // '\r' (Classic Mac lone CR)
    assert(source.get() == '\r');
    assert(source.line() == 4 && source.column() == 0);

    // 'g'
    assert(source.get() == 'g');
    assert(source.line() == 4 && source.column() == 1);

    // 'h'
    assert(source.get() == 'h');
    assert(source.line() == 4 && source.column() == 2);

    // EOF
    assert(source.get() == -1);
}

static void test_buffer_boundary_refills() {
    // 64-char string read with minimum buffer (16 bytes) -> triggers at least 4 refills
    std::string text = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    std::istringstream stream(text);
    streamcsv::CharSource source(stream, 16);

    std::string result;
    int ch;
    while ((ch = source.get()) != -1) {
        result.push_back(static_cast<char>(ch));
    }

    assert(result == text);
    assert(source.column() == 64);
}

static void test_crlf_split_across_buffer_boundary() {
    // Buffer size is 16.
    // We want '\r' at index 15 (last byte of chunk 1) and '\n' at index 16 (first byte of chunk 2).
    // Pad 15 characters before '\r':
    std::string text = "123456789012345\r\nNEXT"; // 15 chars + '\r' + '\n' + "NEXT"
    std::istringstream stream(text);
    streamcsv::CharSource source(stream, 16);

    for (int i = 0; i < 15; ++i) {
        (void)source.get();
    }
    // Now byte 15 is '\r'
    int cr = source.get();
    assert(cr == '\r');
    assert(source.line() == 2);

    // Next byte is '\n' (fetched across the 16-byte refill boundary)
    int lf = source.get();
    assert(lf == '\n');
    assert(source.line() == 2); // Must NOT increment again to 3!

    // 'N'
    int n = source.get();
    assert(n == 'N');
    assert(source.line() == 2);
    assert(source.column() == 1);
}

static void test_utf8_bom_skipping() {
    std::string text = "\xEF\xBB\xBFHello";
    std::istringstream stream(text);
    streamcsv::CharSource source(stream, 16);

    // BOM should be skipped automatically
    assert(source.peek() == 'H');
    assert(source.get() == 'H');
    assert(source.line() == 1 && source.column() == 1);
    assert(source.get() == 'e');
    assert(source.get() == 'l');
    assert(source.get() == 'l');
    assert(source.get() == 'o');
    assert(source.get() == -1);
}

static void test_peek_does_not_advance() {
    std::istringstream stream("XYZ");
    streamcsv::CharSource source(stream, 16);

    for (int i = 0; i < 5; ++i) {
        assert(source.peek() == 'X');
        assert(source.line() == 1 && source.column() == 0);
    }

    assert(source.get() == 'X');
    assert(source.column() == 1);
    assert(source.peek() == 'Y');
}

static void test_unget() {
    std::istringstream stream("AB");
    streamcsv::CharSource source(stream, 16);

    assert(source.get() == 'A');
    assert(source.column() == 1);

    source.unget('A');
    assert(source.column() == 0);

    assert(source.get() == 'A');
    assert(source.column() == 1);

    assert(source.get() == 'B');
    assert(source.column() == 2);
}

int main() {
    std::cout << "Running test_char_source (Phase 2 validation)...\n";
    test_empty_stream();
    test_coordinates_tracking();
    test_buffer_boundary_refills();
    test_crlf_split_across_buffer_boundary();
    test_utf8_bom_skipping();
    test_peek_does_not_advance();
    test_unget();
    std::cout << "test_char_source PASSED! Phase 2 input layer is rock solid.\n";
    return 0;
}

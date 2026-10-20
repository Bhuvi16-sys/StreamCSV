#include <streamcsv/reader.hpp>

#include <algorithm>

namespace streamcsv {

CharSource::CharSource(std::istream& stream, std::size_t buffer_size)
    : stream_(stream),
      buffer_(std::max<std::size_t>(buffer_size, 16)) {}

void CharSource::fill_buffer() {
    if (eof_reached_) {
        return;
    }

    stream_.read(buffer_.data(), static_cast<std::streamsize>(buffer_.size()));
    std::streamsize bytes_read = stream_.gcount();

    buffer_pos_ = 0;
    buffer_len_ = static_cast<std::size_t>(bytes_read);

    if (bytes_read == 0 || !stream_) {
        eof_reached_ = true;
    }
}

void CharSource::check_bom() {
    if (bom_checked_) {
        return;
    }
    bom_checked_ = true;

    if (buffer_len_ == 0) {
        fill_buffer();
    }

    // UTF-8 BOM is 0xEF, 0xBB, 0xBF
    if (buffer_len_ >= 3 &&
        static_cast<unsigned char>(buffer_[0]) == 0xEF &&
        static_cast<unsigned char>(buffer_[1]) == 0xBB &&
        static_cast<unsigned char>(buffer_[2]) == 0xBF) {
        buffer_pos_ = 3;
    }
}

int CharSource::peek() {
    if (!bom_checked_) {
        check_bom();
    }

    if (buffer_pos_ >= buffer_len_) {
        fill_buffer();
        if (buffer_pos_ >= buffer_len_) {
            return -1; // EOF
        }
    }

    return static_cast<unsigned char>(buffer_[buffer_pos_]);
}

int CharSource::get() {
    if (!bom_checked_) {
        check_bom();
    }

    if (buffer_pos_ >= buffer_len_) {
        fill_buffer();
        if (buffer_pos_ >= buffer_len_) {
            return -1; // EOF
        }
    }

    char ch = buffer_[buffer_pos_++];

    prev_line_ = line_;
    prev_column_ = column_;

    if (ch == '\r') {
        last_was_cr_ = true;
        ++line_;
        column_ = 0;
    } else if (ch == '\n') {
        if (last_was_cr_) {
            // CRLF: Line already incremented on \r
            last_was_cr_ = false;
            column_ = 0;
        } else {
            ++line_;
            column_ = 0;
        }
    } else {
        last_was_cr_ = false;
        ++column_;
    }

    return static_cast<unsigned char>(ch);
}

void CharSource::unget(int ch) {
    if (ch == -1) {
        return;
    }

    if (buffer_pos_ > 0) {
        --buffer_pos_;
        line_ = prev_line_;
        column_ = prev_column_;
    }
}

} // namespace streamcsv

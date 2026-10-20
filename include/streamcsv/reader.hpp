#pragma once

#include <streamcsv/error.hpp>
#include <streamcsv/record.hpp>

#include <cstddef>
#include <istream>
#include <memory>
#include <optional>
#include <string>
#include <vector>

namespace streamcsv {

struct ReaderConfig {
    char delimiter{','};
    char quote{'"'};
    bool trim_leading_spaces{false};
    bool skip_empty_lines{true};
    bool strict{true};
    std::size_t max_field_size{16 * 1024 * 1024}; // 16 MB max per field
    std::size_t max_fields_per_record{100000};    // 100k max fields per record
};

class CharSource {
public:
    explicit CharSource(std::istream& stream, std::size_t buffer_size = 8192);

    int get();
    int peek();
    void unget(int ch);

    [[nodiscard]] std::size_t line() const noexcept { return line_; }
    [[nodiscard]] std::size_t column() const noexcept { return column_; }
    [[nodiscard]] bool eof() const noexcept { return eof_reached_ && buffer_pos_ >= buffer_len_; }

private:
    void fill_buffer();
    void check_bom();

    std::istream& stream_;
    std::vector<char> buffer_;
    std::size_t buffer_pos_{0};
    std::size_t buffer_len_{0};
    bool eof_reached_{false};
    bool bom_checked_{false};

    std::size_t line_{1};
    std::size_t column_{0};
    std::size_t prev_line_{1};
    std::size_t prev_column_{0};
    bool last_was_cr_{false};
};

class Reader {
public:
    explicit Reader(std::istream& stream, ReaderConfig config = {});
    explicit Reader(const std::string& csv_data, ReaderConfig config = {});
    ~Reader();

    Reader(const Reader&) = delete;
    Reader& operator=(const Reader&) = delete;
    Reader(Reader&&) noexcept;
    Reader& operator=(Reader&&) noexcept;

    [[nodiscard]] std::optional<Record> next_record();
    bool read_record(Record& out);

    [[nodiscard]] std::size_t current_line() const noexcept;
    [[nodiscard]] const ReaderConfig& config() const noexcept { return config_; }

private:
    enum class State {
        StartOfField,
        UnquotedField,
        QuotedField,
        AfterQuote
    };

    void append_char_to_field(std::string& field, char ch, std::size_t line, std::size_t col);
    void add_field_to_record(Record& record, std::string field, std::size_t line, std::size_t col);

    std::unique_ptr<std::istream> owned_stream_;
    std::unique_ptr<CharSource> source_;
    ReaderConfig config_;
};

} // namespace streamcsv

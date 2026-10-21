#pragma once

#include <streamcsv/error.hpp>
#include <streamcsv/record.hpp>

#include <cstddef>
#include <istream>
#include <iterator>
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
    bool has_header{false};                       // If true, first record is treated as column headers
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

    // Header support
    [[nodiscard]] bool has_header() const noexcept;
    [[nodiscard]] const std::vector<std::string>& header() const;
    void set_header(std::vector<std::string> headers);

    // Range-based for loop & iterator support
    class iterator {
    public:
        using iterator_category = std::input_iterator_tag;
        using value_type = Record;
        using difference_type = std::ptrdiff_t;
        using pointer = const Record*;
        using reference = const Record&;

        iterator() : reader_(nullptr) {}
        explicit iterator(Reader* reader) : reader_(reader) {
            advance();
        }

        reference operator*() const noexcept { return current_; }
        pointer operator->() const noexcept { return &current_; }

        iterator& operator++() {
            advance();
            return *this;
        }

        iterator operator++(int) {
            iterator tmp = *this;
            advance();
            return tmp;
        }

        bool operator==(const iterator& other) const noexcept {
            if (!reader_ && !other.reader_) return true;
            return reader_ == other.reader_;
        }

        bool operator!=(const iterator& other) const noexcept {
            return !(*this == other);
        }

    private:
        void advance() {
            if (reader_) {
                auto rec = reader_->next_record();
                if (rec) {
                    current_ = std::move(*rec);
                } else {
                    reader_ = nullptr;
                    current_ = Record{};
                }
            }
        }

        Reader* reader_{nullptr};
        Record current_{};
    };

    [[nodiscard]] iterator begin() { return iterator(this); }
    [[nodiscard]] iterator end() { return iterator(); }

private:
    enum class State {
        StartOfField,
        UnquotedField,
        QuotedField,
        AfterQuote
    };

    std::optional<Record> parse_raw_record();
    void append_char_to_field(std::string& field, char ch, std::size_t line, std::size_t col);
    void add_field_to_record(Record& record, std::string field, std::size_t line, std::size_t col);

    std::unique_ptr<std::istream> owned_stream_;
    std::unique_ptr<CharSource> source_;
    ReaderConfig config_;
    std::shared_ptr<const std::vector<std::string>> headers_;
    bool header_processed_{false};
};

} // namespace streamcsv

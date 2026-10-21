#pragma once

#include <streamcsv/error.hpp>
#include <streamcsv/record.hpp>

#include <initializer_list>
#include <memory>
#include <ostream>
#include <sstream>
#include <string>
#include <string_view>
#include <type_traits>
#include <vector>

namespace streamcsv {

enum class QuoteStyle {
    Minimal,    // Quotes only when field contains delimiter, quote, \r, or \n
    All,        // Quotes every field
    NonNumeric, // Quotes non-numeric fields
    None        // Never quotes (outputs field verbatim)
};

struct WriterConfig {
    char delimiter{','};
    char quote{'"'};
    std::string newline{"\r\n"}; // RFC 4180 standard CRLF
    QuoteStyle quote_style{QuoteStyle::Minimal};
};

class Writer {
public:
    explicit Writer(std::ostream& stream, WriterConfig config = {});
    ~Writer();

    Writer(const Writer&) = delete;
    Writer& operator=(const Writer&) = delete;
    Writer(Writer&&) noexcept;
    Writer& operator=(Writer&&) noexcept;

    // Writes a single field to the current row buffer
    void write_field(std::string_view field);

    // Concludes the current record by writing the configured newline
    void end_record();

    // Convenience methods to write entire records
    void write_record(const Record& record);
    void write_record(const std::vector<std::string>& fields);
    void write_record(std::initializer_list<std::string> fields);

    // Variadic template for writing typed values into a complete record
    template <typename... Args>
    void write_row(const Args&... args) {
        (write_field_value(args), ...);
        end_record();
    }

    void flush();

    [[nodiscard]] const WriterConfig& config() const noexcept { return config_; }
    [[nodiscard]] std::size_t records_written() const noexcept { return records_written_; }

    // Convenience helper to serialize a single record into an RFC 4180 string
    static std::string to_string(const Record& record, WriterConfig config = {});

private:
    [[nodiscard]] bool needs_quoting(std::string_view field) const;
    void write_escaped_field(std::string_view field);

    template <typename T>
    void write_field_value(const T& val) {
        if constexpr (std::is_convertible_v<T, std::string_view>) {
            write_field(std::string_view(val));
        } else if constexpr (std::is_same_v<T, bool>) {
            write_field(val ? "true" : "false");
        } else {
            std::ostringstream ss;
            ss << val;
            write_field(ss.str());
        }
    }

    std::ostream* stream_{nullptr};
    WriterConfig config_;
    bool first_field_in_row_{true};
    std::size_t records_written_{0};
};

} // namespace streamcsv

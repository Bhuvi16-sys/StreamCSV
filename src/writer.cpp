#include <streamcsv/writer.hpp>

#include <charconv>
#include <system_error>
#include <utility>

namespace streamcsv {

Writer::Writer(std::ostream& stream, WriterConfig config)
    : stream_(&stream), config_(std::move(config)) {}

Writer::~Writer() = default;

Writer::Writer(Writer&&) noexcept = default;
Writer& Writer::operator=(Writer&&) noexcept = default;

static bool is_numeric_field(std::string_view sv) {
    if (sv.empty()) {
        return false;
    }
    if (sv.front() == '+') {
        sv.remove_prefix(1);
        if (sv.empty()) return false;
    }

    double val = 0.0;
    const char* first = sv.data();
    const char* last = sv.data() + sv.size();
    auto [ptr, ec] = std::from_chars(first, last, val);
    return (ec == std::errc{} && ptr == last);
}

bool Writer::needs_quoting(std::string_view field) const {
    switch (config_.quote_style) {
        case QuoteStyle::All:
            return true;
        case QuoteStyle::None:
            return false;
        case QuoteStyle::NonNumeric:
            return !is_numeric_field(field);
        case QuoteStyle::Minimal:
            for (char c : field) {
                if (c == config_.delimiter || c == config_.quote || c == '\r' || c == '\n') {
                    return true;
                }
            }
            return false;
    }
    return false;
}

void Writer::write_escaped_field(std::string_view field) {
    stream_->put(config_.quote);
    for (char c : field) {
        if (c == config_.quote) {
            stream_->put(config_.quote);
            stream_->put(config_.quote);
        } else {
            stream_->put(c);
        }
    }
    stream_->put(config_.quote);
}

void Writer::write_field(std::string_view field) {
    if (!stream_ || !(*stream_)) {
        throw IoError("Stream error while writing CSV field");
    }

    if (!first_field_in_row_) {
        stream_->put(config_.delimiter);
    }
    first_field_in_row_ = false;

    if (needs_quoting(field)) {
        write_escaped_field(field);
    } else {
        stream_->write(field.data(), static_cast<std::streamsize>(field.size()));
    }
}

void Writer::end_record() {
    if (!stream_ || !(*stream_)) {
        throw IoError("Stream error while terminating CSV record");
    }

    stream_->write(config_.newline.data(), static_cast<std::streamsize>(config_.newline.size()));
    first_field_in_row_ = true;
    ++records_written_;
}

void Writer::write_record(const Record& record) {
    for (const auto& field : record) {
        write_field(field);
    }
    end_record();
}

void Writer::write_record(const std::vector<std::string>& fields) {
    for (const auto& field : fields) {
        write_field(field);
    }
    end_record();
}

void Writer::write_record(std::initializer_list<std::string> fields) {
    for (const auto& field : fields) {
        write_field(field);
    }
    end_record();
}

void Writer::flush() {
    if (stream_) {
        stream_->flush();
    }
}

std::string Writer::to_string(const Record& record, WriterConfig config) {
    std::ostringstream ss;
    Writer writer(ss, std::move(config));
    writer.write_record(record);
    return ss.str();
}

} // namespace streamcsv

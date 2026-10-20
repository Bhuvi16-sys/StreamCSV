#include <streamcsv/reader.hpp>

#include <sstream>
#include <utility>

namespace streamcsv {

Reader::Reader(std::istream& stream, ReaderConfig config)
    : source_(std::make_unique<CharSource>(stream)),
      config_(config) {}

Reader::Reader(const std::string& csv_data, ReaderConfig config)
    : owned_stream_(std::make_unique<std::istringstream>(csv_data)),
      source_(std::make_unique<CharSource>(*owned_stream_)),
      config_(config) {}

Reader::~Reader() = default;

Reader::Reader(Reader&&) noexcept = default;
Reader& Reader::operator=(Reader&&) noexcept = default;

std::size_t Reader::current_line() const noexcept {
    return source_ ? source_->line() : 0;
}

void Reader::append_char_to_field(std::string& field, char ch, std::size_t line, std::size_t col) {
    if (field.size() >= config_.max_field_size) {
        throw LimitError("Field size exceeded maximum allowed limit (" +
                         std::to_string(config_.max_field_size) + " bytes)",
                         line, col);
    }
    field.push_back(ch);
}

void Reader::add_field_to_record(Record& record, std::string field, std::size_t line, std::size_t col) {
    if (record.size() >= config_.max_fields_per_record) {
        throw LimitError("Record exceeded maximum allowed column count (" +
                         std::to_string(config_.max_fields_per_record) + ")",
                         line, col);
    }
    record.add_field(std::move(field));
}

bool Reader::read_record(Record& out) {
    auto rec = next_record();
    if (rec) {
        out = std::move(*rec);
        return true;
    }
    return false;
}

std::optional<Record> Reader::next_record() {
    if (!source_ || source_->eof()) {
        return std::nullopt;
    }

    Record record;
    std::string current_field;
    State state = State::StartOfField;
    std::size_t record_start_line = source_->line();
    std::size_t field_start_line = source_->line();
    std::size_t field_start_col = source_->column();

    while (true) {
        int ch = source_->get();

        if (ch == -1) { // EOF
            if (state == State::QuotedField) {
                throw ParseError("Unclosed quote reaching end of file",
                                 field_start_line, field_start_col);
            }
            if (record.empty() && current_field.empty() && state == State::StartOfField) {
                return std::nullopt;
            }
            add_field_to_record(record, std::move(current_field), source_->line(), source_->column());
            record.set_line_number(record_start_line);
            return record;
        }

        switch (state) {
            case State::StartOfField: {
                field_start_line = source_->line();
                field_start_col = source_->column();

                // Skip leading empty lines if requested
                if (config_.skip_empty_lines && record.empty() && current_field.empty()) {
                    if (ch == '\r') {
                        if (source_->peek() == '\n') {
                            source_->get();
                        }
                        record_start_line = source_->line();
                        continue;
                    }
                    if (ch == '\n') {
                        record_start_line = source_->line();
                        continue;
                    }
                }

                if (config_.trim_leading_spaces && (ch == ' ' || ch == '\t')) {
                    continue;
                }

                if (ch == config_.quote) {
                    state = State::QuotedField;
                } else if (ch == config_.delimiter) {
                    add_field_to_record(record, std::move(current_field), source_->line(), source_->column());
                    current_field.clear();
                    // stay in StartOfField
                } else if (ch == '\r' || ch == '\n') {
                    if (ch == '\r' && source_->peek() == '\n') {
                        source_->get();
                    }
                    add_field_to_record(record, std::move(current_field), source_->line(), source_->column());
                    record.set_line_number(record_start_line);
                    return record;
                } else {
                    append_char_to_field(current_field, static_cast<char>(ch), source_->line(), source_->column());
                    state = State::UnquotedField;
                }
                break;
            }

            case State::UnquotedField: {
                if (ch == config_.delimiter) {
                    add_field_to_record(record, std::move(current_field), source_->line(), source_->column());
                    current_field.clear();
                    state = State::StartOfField;
                } else if (ch == '\r' || ch == '\n') {
                    if (ch == '\r' && source_->peek() == '\n') {
                        source_->get();
                    }
                    add_field_to_record(record, std::move(current_field), source_->line(), source_->column());
                    record.set_line_number(record_start_line);
                    return record;
                } else if (ch == config_.quote) {
                    if (config_.strict) {
                        throw ParseError("Unexpected quote character inside unquoted field",
                                         source_->line(), source_->column());
                    }
                    append_char_to_field(current_field, static_cast<char>(ch), source_->line(), source_->column());
                } else {
                    append_char_to_field(current_field, static_cast<char>(ch), source_->line(), source_->column());
                }
                break;
            }

            case State::QuotedField: {
                if (ch == config_.quote) {
                    if (source_->peek() == config_.quote) {
                        // Escaped quote: "" -> "
                        source_->get();
                        append_char_to_field(current_field, config_.quote, source_->line(), source_->column());
                    } else {
                        state = State::AfterQuote;
                    }
                } else {
                    append_char_to_field(current_field, static_cast<char>(ch), source_->line(), source_->column());
                }
                break;
            }

            case State::AfterQuote: {
                if (ch == config_.delimiter) {
                    add_field_to_record(record, std::move(current_field), source_->line(), source_->column());
                    current_field.clear();
                    state = State::StartOfField;
                } else if (ch == '\r' || ch == '\n') {
                    if (ch == '\r' && source_->peek() == '\n') {
                        source_->get();
                    }
                    add_field_to_record(record, std::move(current_field), source_->line(), source_->column());
                    record.set_line_number(record_start_line);
                    return record;
                } else {
                    if (config_.strict) {
                        throw ParseError("Unexpected character after closing quote",
                                         source_->line(), source_->column());
                    }
                    append_char_to_field(current_field, static_cast<char>(ch), source_->line(), source_->column());
                    state = State::UnquotedField;
                }
                break;
            }
        }
    }
}

} // namespace streamcsv

#pragma once

#include <cstddef>
#include <sstream>
#include <stdexcept>
#include <string>

namespace streamcsv {

// Base exception for all StreamCSV errors
class CsvError : public std::runtime_error {
public:
    explicit CsvError(const std::string& message)
        : std::runtime_error(message) {}
};

// Raised when CSV syntax/grammar is violated
class ParseError : public CsvError {
public:
    ParseError(std::string message, std::size_t line, std::size_t col)
        : CsvError(format_message(message, line, col)),
          raw_message_(std::move(message)),
          line_(line),
          column_(col) {}

    [[nodiscard]] std::size_t line() const noexcept { return line_; }
    [[nodiscard]] std::size_t column() const noexcept { return column_; }
    [[nodiscard]] const std::string& raw_message() const noexcept { return raw_message_; }

private:
    static std::string format_message(const std::string& msg, std::size_t line, std::size_t col) {
        std::ostringstream oss;
        oss << "Parse error at line " << line << ", column " << col << ": " << msg;
        return oss.str();
    }

    std::string raw_message_;
    std::size_t line_;
    std::size_t column_;
};

// Raised when bounded-memory limits are exceeded (DoS protection)
class LimitError : public CsvError {
public:
    LimitError(std::string message, std::size_t line, std::size_t col)
        : CsvError(format_message(message, line, col)),
          raw_message_(std::move(message)),
          line_(line),
          column_(col) {}

    [[nodiscard]] std::size_t line() const noexcept { return line_; }
    [[nodiscard]] std::size_t column() const noexcept { return column_; }
    [[nodiscard]] const std::string& raw_message() const noexcept { return raw_message_; }

private:
    static std::string format_message(const std::string& msg, std::size_t line, std::size_t col) {
        std::ostringstream oss;
        oss << "Resource limit exceeded at line " << line << ", column " << col << ": " << msg;
        return oss.str();
    }

    std::string raw_message_;
    std::size_t line_;
    std::size_t column_;
};

// Raised on file I/O failures
class IoError : public CsvError {
public:
    explicit IoError(const std::string& message)
        : CsvError("I/O error: " + message) {}
};

// Raised when a record fails schema validation
class ValidationError : public CsvError {
public:
    explicit ValidationError(const std::string& message)
        : CsvError(message) {}
};

} // namespace streamcsv

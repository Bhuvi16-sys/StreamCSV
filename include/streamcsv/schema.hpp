#pragma once

#include <streamcsv/record.hpp>

#include <cstddef>
#include <functional>
#include <initializer_list>
#include <optional>
#include <string>
#include <string_view>
#include <utility>
#include <vector>

namespace streamcsv {

enum class ColumnType {
    String,
    Integer,
    Float,
    Boolean
};

struct Column {
    std::string name;
    ColumnType type{ColumnType::String};
    bool required{true};
    std::function<bool(const std::string&)> custom_rule{nullptr};
    std::string custom_error_message{"Custom validation rule failed"};

    Column() = default;
    Column(std::string name, ColumnType type = ColumnType::String, bool required = true)
        : name(std::move(name)), type(type), required(required) {}

    Column(std::string name, ColumnType type, bool required,
           std::function<bool(const std::string&)> rule, std::string error_msg)
        : name(std::move(name)),
          type(type),
          required(required),
          custom_rule(std::move(rule)),
          custom_error_message(std::move(error_msg)) {}
};

enum class IssueSeverity {
    Warning,
    Error
};

struct ValidationIssue {
    std::size_t line{0};
    std::size_t column{0};
    std::size_t field_index{0};
    std::string field_name;
    std::string message;
    IssueSeverity severity{IssueSeverity::Error};

    [[nodiscard]] std::string to_string() const;
};

class Schema {
public:
    Schema() = default;
    Schema(std::initializer_list<Column> columns) : columns_(columns) {}
    explicit Schema(std::vector<Column> columns) : columns_(std::move(columns)) {}

    void add_column(Column column) { columns_.push_back(std::move(column)); }
    [[nodiscard]] const std::vector<Column>& columns() const noexcept { return columns_; }
    [[nodiscard]] std::size_t size() const noexcept { return columns_.size(); }
    [[nodiscard]] bool empty() const noexcept { return columns_.empty(); }

    [[nodiscard]] const Column& operator[](std::size_t index) const { return columns_[index]; }

    [[nodiscard]] std::optional<std::size_t> find_index(std::string_view name) const noexcept {
        for (std::size_t i = 0; i < columns_.size(); ++i) {
            if (columns_[i].name == name) {
                return i;
            }
        }
        return std::nullopt;
    }

    [[nodiscard]] const Column* find_column(std::string_view name) const noexcept {
        auto idx = find_index(name);
        return idx ? &columns_[*idx] : nullptr;
    }

private:
    std::vector<Column> columns_;
};

class Validator {
public:
    explicit Validator(Schema schema);

    [[nodiscard]] std::vector<ValidationIssue> validate_record(const Record& record) const;
    [[nodiscard]] bool is_valid(const Record& record) const;

    [[nodiscard]] const Schema& schema() const noexcept { return schema_; }

private:
    bool check_type(const std::string& value, ColumnType type) const;

    Schema schema_;
};

} // namespace streamcsv

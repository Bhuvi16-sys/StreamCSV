#include <streamcsv/schema.hpp>

#include <algorithm>
#include <cctype>
#include <cstdlib>
#include <sstream>

namespace streamcsv {

std::string ValidationIssue::to_string() const {
    std::ostringstream oss;
    oss << (severity == IssueSeverity::Error ? "[Error]" : "[Warning]")
        << " Line " << line << ", Field " << field_index;
    if (!field_name.empty()) {
        oss << " ('" << field_name << "')";
    }
    oss << ": " << message;
    return oss.str();
}

Validator::Validator(Schema schema)
    : schema_(std::move(schema)) {}

static std::string to_lower(std::string_view sv) {
    std::string s;
    s.reserve(sv.size());
    for (char c : sv) {
        s.push_back(static_cast<char>(std::tolower(static_cast<unsigned char>(c))));
    }
    return s;
}

bool Validator::check_type(const std::string& value, ColumnType type) const {
    if (value.empty()) {
        return true; // Empty check is handled by required flag
    }

    switch (type) {
        case ColumnType::String:
            return true;

        case ColumnType::Integer: {
            std::size_t i = 0;
            if (value[0] == '+' || value[0] == '-') {
                i = 1;
            }
            if (i >= value.size()) {
                return false;
            }
            for (; i < value.size(); ++i) {
                if (!std::isdigit(static_cast<unsigned char>(value[i]))) {
                    return false;
                }
            }
            return true;
        }

        case ColumnType::Float: {
            char* end_ptr = nullptr;
            const char* nptr = value.c_str();
            (void)std::strtod(nptr, &end_ptr);
            return end_ptr != nptr && *end_ptr == '\0';
        }

        case ColumnType::Boolean: {
            std::string lower = to_lower(value);
            return lower == "true" || lower == "false" ||
                   lower == "1" || lower == "0" ||
                   lower == "yes" || lower == "no" ||
                   lower == "t" || lower == "f";
        }
    }
    return true;
}

std::vector<ValidationIssue> Validator::validate_record(const Record& record) const {
    std::vector<ValidationIssue> issues;

    if (record.size() != schema_.size()) {
        ValidationIssue issue;
        issue.line = record.line_number();
        issue.column = 1;
        issue.field_index = record.size();
        issue.field_name = "<record>";
        issue.severity = IssueSeverity::Error;
        issue.message = "Field count mismatch: expected " + std::to_string(schema_.size()) +
                        " fields, got " + std::to_string(record.size());
        issues.push_back(issue);
    }

    std::size_t limit = std::min(record.size(), schema_.size());
    for (std::size_t i = 0; i < limit; ++i) {
        const auto& col = schema_[i];
        const auto& val = record[i];

        if (col.required && val.empty()) {
            ValidationIssue issue;
            issue.line = record.line_number();
            issue.column = 1;
            issue.field_index = i;
            issue.field_name = col.name;
            issue.severity = IssueSeverity::Error;
            issue.message = "Required field '" + col.name + "' is empty";
            issues.push_back(issue);
        } else if (!val.empty()) {
            if (!check_type(val, col.type)) {
                ValidationIssue issue;
                issue.line = record.line_number();
                issue.column = 1;
                issue.field_index = i;
                issue.field_name = col.name;
                issue.severity = IssueSeverity::Error;

                std::string type_name = "String";
                if (col.type == ColumnType::Integer) type_name = "Integer";
                else if (col.type == ColumnType::Float) type_name = "Float";
                else if (col.type == ColumnType::Boolean) type_name = "Boolean";

                issue.message = "Value '" + val + "' is not a valid " + type_name;
                issues.push_back(issue);
            } else if (col.custom_rule && !col.custom_rule(val)) {
                ValidationIssue issue;
                issue.line = record.line_number();
                issue.column = 1;
                issue.field_index = i;
                issue.field_name = col.name;
                issue.severity = IssueSeverity::Error;
                issue.message = col.custom_error_message;
                issues.push_back(issue);
            }
        }
    }

    return issues;
}

bool Validator::is_valid(const Record& record) const {
    return validate_record(record).empty();
}

} // namespace streamcsv

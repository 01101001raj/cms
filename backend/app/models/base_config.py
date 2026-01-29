from pydantic import ConfigDict
from pydantic.alias_generators import to_camel

# Standard configuration for all models to support camelCase serialization
# while keeping snake_case in Python code.
base_config = ConfigDict(
    populate_by_name=True,
    alias_generator=to_camel,
    from_attributes=True,
    ser_json_by_alias=True
)

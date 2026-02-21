import { QueryAST } from "./query.js";
import { AdapterCapabilities } from "./adapter.js";
import { CapabilityError } from "./errors.js";

export function validateQuery(query: QueryAST, capabilities: AdapterCapabilities) {
    if (!capabilities.supportsAggregation) {
        if (query.aggregations && query.aggregations.length > 0) {
            throw new CapabilityError("Adapter does not support aggregations");
        }
        if (query.groupBy && query.groupBy.length > 0) {
            throw new CapabilityError("Adapter does not support grouping");
        }
    }

    // Future validations like supportsJoins can go here once Join AST nodes are added

    return true;
}

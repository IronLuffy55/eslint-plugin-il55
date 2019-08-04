/**
 * @fileoverview DDB calls should use await syntax
 * @author ...
 */
"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

var rule = require("../../../lib/rules/use-ddb-with-promise"),

    RuleTester = require("eslint").RuleTester;


//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

var ruleTester = new RuleTester();
ruleTester.run("use-ddb-with-promise", rule, {

    valid: [

        // give me some code that won't trigger a warning
    ],

    invalid: [
        {
            code: "await ddb.put({...});",
            errors: [{
                message: "Fill me in.",
                type: "Me too"
            }]
        }
    ]
});

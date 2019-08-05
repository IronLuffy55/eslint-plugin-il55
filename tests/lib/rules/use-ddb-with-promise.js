// /**
//  * @fileoverview DDB calls should use await syntax
//  * @author ...
//  */
// "use strict";

// //------------------------------------------------------------------------------
// // Requirements
// //------------------------------------------------------------------------------

// var rule = require("../../../lib/rules/use-ddb-with-promise"),

//     RuleTester = require("eslint").RuleTester;

// //------------------------------------------------------------------------------
// // Tests
// //------------------------------------------------------------------------------

// var ruleTester = new RuleTester();
// ruleTester.run("use-ddb-with-promise", rule, {

//     valid: [

//         // give me some code that won't trigger a warning
//     ],

//     invalid: [
//         {
//             code: "await ddb.put({...});",
//             errors: [{
//                 message: "Fill me in.",
//                 type: "Me too"
//             }]
//         }
//     ]
// });

import AWS2 from "aws-sdk";
import { DynamoDB as Custom, SQS as ImportSQS, SNS } from "aws-sdk";
const AWS3 = require("aws-sdk");
const { DynamoDB: SOMETHING, SNS, SQS } = require("aws-sdk");
//const tmp = AWS2 //@TODO: Take care of reassignment
const ddb2 = new AWS2.DynamoDB.DocumentClient({ region });
const ddb6 = new AWS3.DynamoDB.DocumentClient({ region });
ddb2.get();
ddb2.get().promise();
ddb2.get().promise;
ddb6.get();
ddb6.get().promise();
ddb6.get().promise;
const sqs = new AWS2.SQS.DocumentClient({ region });
const ddb3 = new Custom.DocumentClient({ region });
ddb3.get();
ddb3.get().promise();
ddb3.get().promise;
const ddb4 = new Custom.DocumentClient({ region });
ddb4.get();
ddb4.get().promise();
ddb4.get().promise;
const ddb5 = new SOMETHING.DocumentClient({ region });
ddb5.get();
ddb5.get().promise();
ddb5.get().promise;
//
//const ddb2 = new AWS.DynamoDB.DocumentClient({region});
/*
const ddb5 = new DynamoDB.DocumentClient({region});
const ddb4 = ddb2;

ddb2.put()
ddb5.put()
ddb5.put
ddb.put().promise*/
//ddb2

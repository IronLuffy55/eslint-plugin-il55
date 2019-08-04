/**
 * @fileoverview DDB calls should use await syntax
 * @author ...
 */
"use strict";

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = {
  meta: {
    docs: {
      description: "DDB calls should use await syntax",
      category: "Fill me in",
      recommended: false
    },
    fixable: null, // or "code" or "whitespace"
    schema: [
      // fill in your schema
    ]
  },

  create: function(context) {
    const ddbNodes = [];
    return {
      "Program:exit"() {
        ddbNodes.forEach(node => {
          const calls = context.getDeclaredVariables(node.parent);
          calls[0].references.forEach(reference => {
            if (reference.identifier.parent.type !== "MemberExpression") {
              //ddb variable is not being called as part of a function statement (e.g. ddb.get)
              //dont care if promise is not used
              return;
            }
            const ddbMemberExpression = reference.identifier.parent;
            const ddbCallExpression = ddbMemberExpression.parent;
            if (ddbCallExpression.parent.type !== "MemberExpression") {
              //valid ddb called as a function but not with a promise
              //e.g. (ddb.get())
              context.report({
                node: ddbCallExpression,
                message: "Promise is not being used"
              });
              return;
            }
            const chainedDDBMemberExpression = ddbCallExpression.parent;
            if (chainedDDBMemberExpression.parent.type !== "CallExpression") {
              //promise property is accessed but not called as a function
              //e.g. (ddb.get().promise)
              context.report({
                node: chainedDDBMemberExpression.parent,
                message: "Promise is accessed but not called as a function"
              });
              return;
            }
          });
        });
        console.log("DONE");
      },
      NewExpression(node) {
        const isDocumentClient = looksLike(node, {
          callee: {
            object: {
              name: "DynamoDB"
            },
            property: {
              name: "DocumentClient"
            }
          }
        });
        if (!isDocumentClient) return;
        context.getDeclaredVariables(node.parent);
        ddbNodes.push(node);
      }
    };
    function findParent(node, criteria = {}) {
      if (looksLike(node.parent, criteria)) return node.parent;
      return findParent(node.parent);
    }
    //credit to kent dodds
    function looksLike(a, b) {
      return (
        a &&
        b &&
        Object.keys(b).every(bKey => {
          const bVal = b[bKey];
          const aVal = a[bKey];
          if (typeof bVal === "function") {
            return bVal(aVal);
          }
          return isPrimitive(bVal) ? bVal === aVal : looksLike(aVal, bVal);
        })
      );
    }
    //credit to kent dodds
    function isPrimitive(val) {
      return val == null || /^[sbn]/.test(typeof val);
    }
  }
};

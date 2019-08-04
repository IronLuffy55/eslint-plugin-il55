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
    // variables should be defined here
    //----------------------------------------------------------------------
    // Helpers
    //----------------------------------------------------------------------
    // any helper functions should go here or else delete this section
    const ddbActions = ["put"];
    //----------------------------------------------------------------------
    // Public
    //----------------------------------------------------------------------

    return {
      CallExpression(node) {
        const isPutCall = looksLike(node, {
          callee: {
            type: "MemberExpression",
            property: {
              type: "Identifier",
              name: "put"
            }
          }
        });
        if (!isPutCall) return;
        const p = node.parent;
        const usesPromise = looksLike(p, {
          property: {
            type: "Identifier",
            name: "promise"
          }
        });
        if (!usesPromise || p.parent.type != "CallExpression") {
          context.report({
            node: node.callee.property,
            message: "Missing call to promise()"
          });
        }
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

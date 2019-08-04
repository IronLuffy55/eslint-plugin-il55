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
    const awsImports = [];
    const awsRequires = [];
    const ddbDestructs = [];
    return {
      "Program:exit"(node) {
        const ddbVariableDeclarators = findDDBVariableDeclaratorsFromAWSNodes(
          context
        );
        const ddbReferences = findDDBReferences(
          ddbVariableDeclarators,
          context
        );
        ddbReferences.forEach(node => {
          validateDDBCall(node, context);
        });

        console.log("Done");
      },
      ImportDeclaration(node) {
        if (node.source.value !== "aws-sdk") return;
        node.specifiers.forEach(importNode => {
          if (importNode.type == "ImportSpecifier") {
            if (importNode.imported.name !== "DynamoDB") {
              return;
            }
            ddbDestructs.push(importNode);
          } else if (importNode.type === "ImportDefaultSpecifier") {
            //Importing AWS Module
            awsImports.push(importNode);
          } else {
            //unknown state
          }
        });
        return;
      },
      VariableDeclaration(node) {
        const isLoadingAWSSDK = looksLike(node, {
          declarations: declarationsNode => {
            const includesAWSSDK = declarationsNode.find(node => {
              return node.init.arguments.find(
                ({ value }) => value === "aws-sdk"
              );
            });
            return includesAWSSDK;
          }
        });
        if (!isLoadingAWSSDK) return;

        node.declarations.forEach(variableDeclaratornNode => {
          //              console.log("variableDeclaratornNode>", variableDeclaratornNode)
          if (variableDeclaratornNode.id.type == "ObjectPattern") {
            //deconstructed
          } else if (variableDeclaratornNode.id.type == "Identifier") {
            //requiring module
            awsRequires.push(variableDeclaratornNode);
          } else {
            //unknown case
          }
        });
      }
    };
    function findParent(node, criteria = {}) {
      if (looksLike(node.parent, criteria)) return node.parent;
      return findParent(node.parent, criteria);
    }
    function validateDDBCall(node, context) {
      if (node.identifier.parent.type !== "MemberExpression") {
        //ddb variable is not being called as part of a function statement (e.g. ddb.get)
        //dont care if promise is not used
        return;
      }
      const ddbMemberExpression = node.identifier.parent;
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
    }
    function findDDBVariableDeclaratorsFromAWSNodes(context) {
      const variableDeclarators = [];
      awsImports.concat(awsRequires).forEach(node => {
        const declaredVariable = context.getDeclaredVariables(node)[0];
        declaredVariable.references.forEach(reference => {
          const newExpression = findParent(reference.identifier, {
            type: "NewExpression"
          });
          if (!newExpression) return;

          if (
            newExpression.callee.object.property.name !== "DynamoDB" ||
            newExpression.callee.property.name !== "DocumentClient"
          ) {
            return;
          }
          variableDeclarators.push(newExpression.parent);
        });
      });
      return variableDeclarators.filter(Boolean);
    }
    function findDDBReferences(nodes = [], context) {
      let ddbReferences = [];
      nodes.forEach(node => {
        const references = context.getDeclaredVariables(node)[0].references;
        ddbReferences = ddbReferences.concat(references);
      });
      return ddbReferences;
    }
    function findParent(node, criteria = {}) {
      if (!node) return null;
      if (looksLike(node.parent, criteria)) return node.parent;
      return findParent(node.parent, criteria);
    }
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

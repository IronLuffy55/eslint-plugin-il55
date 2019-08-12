/**
 * @fileoverview DDB calls should use await syntax
 * @author ...
 */
"use strict";
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
    /* Arrays hold references to VariableDeclarators or ImportSpecifiers that can be used to create ddb instances:
      1. awsImports - e.g. import AWS from 'aws-sdk'
      2. awsRequires - e.g. const AWS from require('aws-sdk') or const AWS2 = AWS
      3. ddbImportDestructs - e.g. import {DynamoDB} from 'aws-sdk' or const DynamoDB = AWS.DynamoDB
      4. ddbRequireDestructs - e.g. const {DynamoDB} = require('aws-sdk')
      5. documentClientDestructs - e.g. const {DocumentClient} = DynamoDB or const DocumentClient = DynamoDB.DocumentClient
    */
    const awsImports = [];
    const awsRequires = [];
    const ddbImportDestructs = [];
    const ddbRequireDestructs = [];
    const documentClientDestructs = [];
    return {
      "Program:exit"(node) {
        const nodes = awsImports.concat(awsRequires).concat(ddbImportDestructs);
        const set1 = findDDBInstancesFromNodes(nodes);
        const set2 = findDDBInstancesFromRequireDestructs(ddbRequireDestructs);
        const set3 = findDDBInstancesFromDocumentClientDestructs(
          documentClientDestructs
        );
        const set4 = set1.concat(set2).concat(set3);
        const references = findDDBCallsFromVariableDeclarators(set4);
        references.forEach(validateDDBCall);
      },
      ImportDeclaration(node) {
        if (node.source.value !== "aws-sdk") return;
        node.specifiers.forEach(importNode => {
          if (importNode.type == "ImportSpecifier") {
            if (importNode.imported.name !== "DynamoDB") {
              return;
            }
            ddbImportDestructs.push(importNode);
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
        const awsImportNames = awsImports.map(({ local }) => local.name);
        const awsRequireNames = awsRequires.map(({ id }) => id.name);
        const ddbRequireNames = ddbRequireDestructs
          .map(({ id }) => {
            const property = id.properties.find(
              ({ key }) => key.name == "DynamoDB"
            );
            return property && property.value.name;
          })
          .filter(Boolean);
        const ddbImportNames = ddbImportDestructs.map(({ id }) => id.name);
        const documentClientNames = documentClientDestructs
          .map(({ id }) => {
            return (
              id &&
              id.properties[0] &&
              id.properties[0].value &&
              id.properties[0].value.name
            );
          })
          .filter(Boolean);
        node.declarations.forEach(declaration => {
          if (declaration.id.type == "ObjectPattern") {
            //destructing variable
            const ddbPropertyNode = declaration.id.properties.find(({ key }) =>
              ["DynamoDB", "DocumentClient"].includes(key.name)
            );
            if (!ddbPropertyNode) {
              return;
            }
            switch (ddbPropertyNode.key.name) {
              case "DynamoDB":
                ddbRequireDestructs.push(declaration);
                return;
              case "DocumentClient":
                documentClientDestructs.push(declaration);
                return;
              default:
              //should not reach this state
            }
          } else if (declaration.init.type == "CallExpression") {
            //variable declared from func
            //e.g. var x = require('')
            declaration.init.arguments.find(({ value }) => value === "aws-sdk");
            awsRequires.push(declaration);
          } else if (declaration.init.type == "Identifier") {
            //assigning variable to value
            //e.g. var y = 1; var x = y
            const initName = declaration.init.name;
            if (
              awsImportNames.includes(initName) ||
              awsRequireNames.includes(initName)
            ) {
              awsRequires.push(declaration);
            } else if (
              ddbRequireNames.includes(initName) ||
              ddbImportNames.includes(initName)
            ) {
              ddbImportDestructs.push(declaration);
            } else if (documentClientNames.includes(initName)) {
              documentClientDestructs.push(declaration);
            } else {
            }
          } else if (declaration.init.type == "MemberExpression") {
            //assigning variable to object member
            //e.g. var x = obj.prop.value
            if (declaration.init.property.name == "DynamoDB") {
              ddbImportDestructs.push(declaration);
            } else if (declaration.init.property.name == "DocumentClient") {
              documentClientDestructs.push(declaration);
            } else {
            }
          } else if (declaration.init.type == "NewExpression") {
            //assigning variable to new instance
            //e.g. var x = new Foo()
            //skip for now - we are creating an instance of this variable
          }
        });
      }
    };
    //#region Utils
    function findDDBInstancesFromNodes(nodes = []) {
      const variableDeclarators = [];
      nodes.forEach(node => {
        const declaredVariable = context.getDeclaredVariables(node)[0];
        declaredVariable.references.forEach(reference => {
          const newExpression = findParent(reference.identifier, {
            type: "NewExpression"
          });
          if (!newExpression) return;

          if (newExpression.callee.property.name !== "DocumentClient") {
            return;
          }
          variableDeclarators.push(newExpression.parent);
        });
      });
      return variableDeclarators.filter(Boolean);
    }
    function findDDBInstancesFromRequireDestructs(nodes = []) {
      let variableDeclarators = [];
      nodes.forEach(node => {
        const vars = context.getDeclaredVariables(node);
        const refs = vars[0].references.slice(1);
        refs.forEach(ref => {
          const variableDeclarator = findParent(ref.identifier, {
            type: "MemberExpression",
            parent: {
              type: "NewExpression",
              parent: {
                type: "VariableDeclarator"
              }
            }
          });
          if (variableDeclarator) variableDeclarators.push(variableDeclarator);
        });
      });
      return variableDeclarators;
    }
    function findDDBInstancesFromDocumentClientDestructs(nodes = []) {
      let variableDeclarators = [];
      nodes.forEach(node => {
        const vars = context.getDeclaredVariables(node);
        const refs = vars[0].references.slice(1);
        refs.forEach(ref => {
          const variableDeclarator = findParent(ref.identifier, {
            type: "NewExpression",
            parent: {
              type: "VariableDeclarator"
            }
          });
          if (variableDeclarator) variableDeclarators.push(variableDeclarator);
        });
      });
      return variableDeclarators;
    }
    function findDDBCallsFromVariableDeclarators(nodes = []) {
      let ddbReferences = [];
      nodes.forEach(node => {
        const references = context.getDeclaredVariables(node)[0].references;
        ddbReferences = ddbReferences.concat(references);
      });
      return ddbReferences;
    }
    function validateDDBCall(node) {
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
    function findParent(node, criteria = {}) {
      if (!node) return null;
      if (looksLike(node.parent, criteria)) {
        if (criteria.parent) {
          return findParent(node.parent, criteria.parent);
        }
        return node.parent;
      }
      return findParent(node.parent, criteria);
    }
    //attribution: https://github.com/kentcdodds/asts-workshop
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
    //attribution: https://github.com/kentcdodds/asts-workshop
    function isPrimitive(val) {
      return val == null || /^[sbn]/.test(typeof val);
    }
    //#endregion
  }
};

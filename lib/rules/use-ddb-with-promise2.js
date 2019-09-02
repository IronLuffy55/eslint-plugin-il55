module.exports = {
  meta: {
    docs: {
      description: "DDB calls should use await syntax",
      category: "Fill me in",
      recommended: false
    },
    fixable: "code", // or "code" or "whitespace"
    schema: [
      // fill in your schema
    ]
  },
  create: function(context) {
    const instantiators = {
      aws: [],
      ddb: [],
      dc: []
    };
    return {
      "Program:exit"(node) {
        if (instantiators.aws.length) {
          //find all ddb variable declarators, e.g. const ddb = new AWS.DynamoDB.DocumentClient({});
          let ddbVariableDeclaratoreNodes = findDDBVariableDeclaratorNodes(
            instantiators.aws
          );
          console.log(
            "number of ddb variable declarators>",
            ddbVariableDeclaratoreNodes.length
          );
          //find all ddb function calls
          ddbVariableDeclaratoreNodes.forEach(node => {
            //find all calls to ddb variable, e.g. ddb;, ddb.get();, ddb.put();
            const variableDeclarators = context.getDeclaredVariables(node);
            variableDeclarators.forEach(({ references }) => {
              references
                .filter(({ init }) => !init)
                .forEach(({ identifier }) => {
                  const callExpressionNode = findParent(identifier, {
                    type: "CallExpression"
                  });
                  if (!callExpressionNode) return; //ddb not called
                  const isPromiseUsed = findParent(callExpressionNode, {
                    type: "MemberExpression",
                    property: {
                      name: "promise"
                    },
                    parent: {
                      type: "CallExpression"
                    }
                  });
                  if (isPromiseUsed) return;

                  const expressionStatementNode = findParent(
                    callExpressionNode,
                    {
                      type: "ExpressionStatement"
                    }
                  );
                  let expression = expressionStatementNode.expression;
                  let problemNode;
                  let fix = null;

                  if (nodeUtils.isMemberExpression(expression)) {
                    problemNode = expression.property;
                    fix = fixer => {
                      return fixer.replaceText(problemNode, "promise()");
                    };
                  } else if (nodeUtils.isCallExpression(expression)) {
                    problemNode = expression.callee.property;
                    fix = fixer => {
                      const changes = problemNode
                        ? `${problemNode.name}().promise`
                        : null;
                      return problemNode
                        ? fixer.replaceText(problemNode, changes)
                        : null;
                    };
                  } else {
                    problemNode = callExpressionNode;
                  }

                  context.report({
                    node: problemNode || callExpressionNode,
                    message: "Missing: .promise()",
                    fix
                  });
                });
            });
          });
        }
      },
      ImportDeclaration(node) {
        if (!nodeUtils.isAWSNode(node)) {
          return;
        }
        instantiators.aws.push(node);
      },
      VariableDeclaration(node) {
        node.declarations.forEach(declaratorNode => {
          if (nodeUtils.isAWSNode(declaratorNode)) {
            instantiators.aws.push(declaratorNode);
          }
        });
      }
    };
    function findDDBVariableDeclaratorNodes(nodes) {
      let ddbVariableDeclaratoreNodes = [];
      console.log("findDDBVariableDeclaratorNodes: start");
      nodes.forEach(node => {
        const variableDeclarators = context.getDeclaredVariables(node);
        //https://eslint.org/docs/developer-guide/scope-manager-interface#reference-interface
        variableDeclarators.forEach(({ references }) => {
          ddbVariableDeclaratoreNodes = [
            ...ddbVariableDeclaratoreNodes,
            ...references
              .filter(({ init }) => !init) //ignore variable initializers, e.g. const AWS = require('aws-sdk');
              .flatMap(({ identifier }) => {
                console.log("identifier>", identifier);
                if (nodeUtils.isVariableDeclarator(identifier.parent)) {
                  //immediate variable declarator parent = reassigning AWS module
                  return findDDBVariableDeclaratorNodes([identifier.parent]);
                }
                //look up the node tree for variable declaration
                const variableDeclarationNode = findParent(identifier, {
                  type: "VariableDeclaration"
                });
                if (!variableDeclarationNode) return null;
                return variableDeclarationNode.declarations.filter(
                  declaratorNode =>
                    nodeUtils.isDocumentClientVariableDeclaratorNode(
                      declaratorNode
                    )
                );
              })
              .filter(Boolean)
          ];
        });
      });
      return ddbVariableDeclaratoreNodes;
    }
  }
};

const nodeUtils = {
  isAWSNode(node) {
    if (this.isImportDeclaration(node)) {
      return looksLike(node, {
        source: {
          value: "aws-sdk"
        }
      });
    } else if (this.isRequireVariableDeclarator(node)) {
      return looksLike(
        node,
        {
          init: {
            arguments: [
              {
                value: "aws-sdk"
              }
            ]
          }
        },
        true
      );
    }
  },
  isDynamoDBVariableDeclaratorNode(node) {
    return looksLike(node, {
      type: "VariableDeclarator",
      init: {
        type: "NewExpression"
      }
    });
  },
  isDocumentClientVariableDeclaratorNode(node) {
    return looksLike(node, {
      type: "VariableDeclarator",
      init: {
        type: "NewExpression",
        callee: {
          property: {
            name: "DocumentClient"
          }
        }
      }
    });
  },
  isImportDeclaration(node) {
    return node.type == "ImportDeclaration";
  },
  isMemberExpression(node) {
    return node.type == "MemberExpression";
  },
  isExpressionStatement(node) {
    return node.type == "ExpressionStatement";
  },
  isCallExpression(node) {
    return node.type == "CallExpression";
  },
  isVariableDeclarator(node) {
    return node.type == "VariableDeclarator";
  },
  isVariableDeclaration(node) {
    return node.type == "VariableDeclaration";
  },
  isRequireVariableDeclarator(node) {
    return looksLike(node, {
      type: "VariableDeclarator",
      init: {
        callee: {
          name: "require"
        },
        type: "CallExpression"
      }
    });
  }
};
//#region utils
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
function looksLike(a, b, debug, level = 0) {
  return (
    a &&
    b &&
    Object.keys(b).every(bKey => {
      const bVal = b[bKey];
      const aVal = a[bKey];
      if (typeof bVal === "function") {
        return bVal(aVal);
      }

      return isPrimitive(bVal)
        ? bVal === aVal
        : looksLike(aVal, bVal, debug, level + 1);
    })
  );
}
//attribution: https://github.com/kentcdodds/asts-workshop
function isPrimitive(val) {
  return val == null || /^[sbn]/.test(typeof val);
}
//#endregion

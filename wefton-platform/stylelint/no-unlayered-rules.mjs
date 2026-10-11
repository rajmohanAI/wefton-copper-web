// Stylelint rule: every style rule must sit inside a cascade layer.
//
// Tailwind CSS 4 emits its utilities in @layer utilities. Any unlayered rule
// beats all layered rules regardless of specificity, so an unlayered reset
// like `* { padding: 0 }` silently disables every px-*, py-*, m*-* utility.
//
// Allowed outside @layer:
//   - rules inside @keyframes, and Tailwind's @theme / @utility blocks
//   - rules that only declare custom properties (--token: value)
import stylelint from 'stylelint';

const ruleName = 'wefton/no-unlayered-rules';
const messages = stylelint.utils.ruleMessages(ruleName, {
  rejected: (selector) =>
    `Unlayered rule "${selector}" overrides Tailwind utilities. Move it into @layer base or @layer components.`,
});

const LAYERING_AT_RULES = new Set(['layer', 'keyframes', 'theme', 'utility']);

function isLayered(node) {
  for (let p = node.parent; p && p.type !== 'root'; p = p.parent) {
    if (p.type === 'atrule' && LAYERING_AT_RULES.has(p.name.replace(/^-\w+-/, ''))) return true;
  }
  return false;
}

function onlyCustomProperties(rule) {
  const decls = rule.nodes.filter((n) => n.type === 'decl');
  return decls.length > 0 && decls.length === rule.nodes.filter((n) => n.type !== 'comment').length &&
    decls.every((d) => d.prop.startsWith('--'));
}

const rule = (enabled) => (root, result) => {
  if (!enabled) return;
  root.walkRules((node) => {
    if (isLayered(node) || onlyCustomProperties(node)) return;
    stylelint.utils.report({ ruleName, result, node, message: messages.rejected(node.selector) });
  });
};

rule.ruleName = ruleName;
rule.messages = messages;

export default stylelint.createPlugin(ruleName, rule);

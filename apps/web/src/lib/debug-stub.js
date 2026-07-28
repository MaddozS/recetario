function createDebug(namespace) {
  const logger = function (..._args) {};
  logger.enabled = false;
  logger.namespace = namespace || "";
  logger.extend = (ns) => createDebug(namespace ? namespace + ":" + ns : ns);
  return logger;
}
createDebug.enabled = false;
createDebug.log = (..._args) => {};
createDebug.namespaces = [];
createDebug.inspectOpts = {};
createDebug.selectColor = () => "";
createDebug.humanize = () => "";
createDebug.formatArgs = (..._args) => {};
createDebug.save = (..._args) => createDebug;
createDebug.load = () => createDebug;
createDebug.useColors = () => false;
createDebug.colors = [];
createDebug.styles = {};

export default createDebug;

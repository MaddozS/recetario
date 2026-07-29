function createDebug(namespace) {
  const logger = function () {};
  logger.enabled = false;
  logger.namespace = namespace || "";
  logger.extend = (ns) => createDebug(namespace ? namespace + ":" + ns : ns);
  return logger;
}
createDebug.enabled = false;
createDebug.log = () => {};
createDebug.namespaces = [];
createDebug.inspectOpts = {};
createDebug.selectColor = () => "";
createDebug.humanize = () => "";
createDebug.formatArgs = () => {};
createDebug.save = () => createDebug;
createDebug.load = () => createDebug;
createDebug.useColors = () => false;
createDebug.colors = [];
createDebug.styles = {};

export default createDebug;

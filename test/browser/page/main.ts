// The driver calls `runSuite` with the served engine and image; the suite's scenarios run in order on one VM.
import { enableModuleCommands } from "@oxvm/sdk/wasm";
import { oxvmRust } from "./oxvm.modules.generated";
import { openVM, runAll, type Config } from "./support";
import { scenarios } from "./suite";

async function runSuite(config: Config) {
  // Suites that open further VMs (durability across a restart) read the served engine and image from here.
  Object.defineProperty(window, "suiteConfig", { value: config, configurable: true });
  const vm = await openVM(config);
  try {
    await vm.exec({ command: "/bin/mkdir", args: ["-p", "/workspace/t"], stdin: new Uint8Array() });
    const commands = await enableModuleCommands(vm, oxvmRust);
    try { return await runAll(vm, scenarios); } finally { await commands.disable(); }
  } finally { await vm.dispose(); }
}
/** WebKit cannot isolate module workers (engine ADR 0028): turning the commands on must fail with a typed error. */
async function runRefusal(config: Config) {
  const vm = await openVM(config);
  try {
    await enableModuleCommands(vm, oxvmRust);
    return [{ name: "WebKit refuses the module with a typed error (OBL-REFUSAL)", ok: false, detail: "the module was enabled" }];
  } catch (error: unknown) {
    const code = typeof error === "object" && error !== null ? String(Reflect.get(error, "code")) : String(error);
    return [{ name: "WebKit refuses the module with a typed error (OBL-REFUSAL)", ok: code !== "undefined" && code.length > 0, detail: `${code}: ${error instanceof Error ? error.message : ""}` }];
  } finally { await vm.dispose(); }
}
Object.defineProperty(window, "runSuite", { value: runSuite, enumerable: true });
Object.defineProperty(window, "runRefusal", { value: runRefusal, enumerable: true });

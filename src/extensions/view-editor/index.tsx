import { StudioExtension } from "@/core/extension-base";
import { createTabExtension } from "@/core/extension-tab";
import ViewTab from "./view-tab";
import ViewDataTab from "./view-data-tab";
import { LucideView } from "lucide-react";
import { StudioExtensionContext } from "@/core/extension-manager";

export const viewEditorExtensionTab = createTabExtension<{
  schemaName?: string;
  name?: string;
}>({
  name: "view",
  key: (options) => {
    return `${options.schemaName}.${options.name}`;
  },
  generate: (options) => ({
    title: options.name || "New View",
    component: (
      <ViewTab schemaName={options.schemaName} name={options.name ?? ""} />
    ),
    icon: LucideView,
  }),
});

export const viewDataExtensionTab = createTabExtension<{
  schemaName: string;
  viewName: string;
}>({
  name: "view-data",
  key: (options) => {
    return `view-data-${options.schemaName}.${options.viewName}`;
  },
  generate: (options) => ({
    title: options.viewName,
    component: (
      <ViewDataTab schemaName={options.schemaName} viewName={options.viewName} />
    ),
    icon: LucideView,
  }),
});

export default class ViewEditorExtension extends StudioExtension {
  extensionName = "view-editor";

  init(studio: StudioExtensionContext): void {
    studio.registerCreateResourceMenu({
      key: "view",
      title: "Create View",
      onClick: () => {
        viewEditorExtensionTab.open({});
      },
    });

    // Open view to see data (table or board view)
    studio.registerResourceContextMenu((resource) => {
      if (resource.type !== "view") return;
      return {
        key: "view-open",
        title: "Open View",
        onClick: () => {
          viewDataExtensionTab.open({
            schemaName: resource.schemaName,
            viewName: resource.name,
          });
        },
      };
    });

    // Edit view definition
    studio.registerResourceContextMenu((resource) => {
      if (resource.type !== "view") return;
      return {
        key: "view-edit",
        title: "Edit View",
        onClick: () => {
          viewEditorExtensionTab.open({
            schemaName: resource.schemaName,
            name: resource.name,
          });
        },
      };
    }, "modification");
  }
}

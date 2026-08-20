# Component Code Templates

Reference templates for each component type. Replace `{Entity}`, `{entity}`, and field names with actual values.

---

## List Page Template

```typescript
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";

import MainLayout from "@/components/layout/MainLayout";
import Card from "@/components/ui/Card";
import DataTable from "@/components/ui/DataTable";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import ConfirmDeleteModal from "@/components/ui/ConfirmDeleteModal";
import TableToolbar from "@/components/ui/TableToolbar";

import { useTableSettings } from "@/hooks/useTableSettings";
import { useCrudModal } from "@/hooks/useCrudModal";
import { useDeleteConfirm } from "@/hooks/useDeleteConfirm";

import type { {Entity} } from "@/types";
import type { Column } from "@/components/ui/DataTable";

import * as api from "@/lib/api";
import { {ENTITY}_STATUT_COLORS } from "@/lib/constants";
import { exportToExcel } from "@/lib/exportExcel";

const defaultForm = { nom: "", description: "", statut: "INITIAL" as Statut{Entity} };

export default function {Entity}sPage() {
  const { t } = useTranslation(["{entity}s", "common", "enums"]);
  const router = useRouter();

  // --- State ---
  const [data, setData] = useState<{Entity}[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTerm, setFilterTerm] = useState("");
  const initialLoadDone = useRef(false);

  // --- CRUD hooks ---
  const crud = useCrudModal<{Entity}, typeof defaultForm>(
    defaultForm,
    (item) => ({ nom: item.nom, description: item.description, statut: item.statut })
  );
  const del = useDeleteConfirm<{Entity}>();

  // --- Table settings ---
  const ts = useTableSettings(
    ["nom", "statut"],
    10,
    ["nom", "statut", "actions"],
    "{entity}s"
  );

  // --- Data fetching ---
  const fetchData = useCallback(() => {
    if (!initialLoadDone.current) setLoading(true);
    Promise.all([api.get{Entity}s()])
      .then(([res]) => { setData(res.data); })
      .finally(() => { setLoading(false); initialLoadDone.current = true; });
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- Columns ---
  const allColumns: Column<{Entity}>[] = useMemo(() => [
    { key: "nom", header: t("columns.nom"), sortable: true },
    {
      key: "statut", header: t("columns.statut"), sortable: true,
      render: (item) => (
        <Badge color={{ENTITY}_STATUT_COLORS[item.statut]}>
          {t(`Statut{Entity}.${item.statut}`, { ns: "enums" })}
        </Badge>
      ),
    },
    {
      key: "actions", header: "",
      render: (item) => (
        <div className="flex gap-1">
          <button onClick={(ev) => { ev.stopPropagation(); crud.openEdit(item); }}>
            <Pencil className="h-4 w-4 text-indigo-600 hover:text-indigo-800" />
          </button>
          <button onClick={(ev) => { ev.stopPropagation(); del.requestDelete(item); }}>
            <Trash2 className="h-4 w-4 text-red-500 hover:text-red-700" />
          </button>
        </div>
      ),
    },
  ], [t, crud, del]);

  // --- Filtering & column visibility ---
  const filteredData = useMemo(() =>
    data.filter((e) => e.nom.toLowerCase().includes(filterTerm.toLowerCase())),
    [data, filterTerm]
  );

  const columns = useMemo(() =>
    allColumns
      .filter((c) => c.key === "nom" || c.key === "actions" || ts.visibleColumns.has(c.key))
      .sort((a, b) => ts.columnOrder.indexOf(a.key) - ts.columnOrder.indexOf(b.key)),
    [allColumns, ts.visibleColumns, ts.columnOrder]
  );

  const toggleableColumns = useMemo(() =>
    allColumns.filter((c) => c.key !== "nom" && c.key !== "actions"),
    [allColumns]
  );

  // --- CRUD handlers ---
  const handleSubmit = async () => {
    try {
      if (crud.editItem) {
        await api.update{Entity}(crud.editItem.id, crud.form);
      } else {
        await api.create{Entity}(crud.form);
      }
      crud.close();
      fetchData();
    } catch { /* global interceptor handles toast */ }
  };

  const handleDelete = async () => {
    try {
      await api.delete{Entity}(del.target!.id);
      del.cancel();
      fetchData();
    } catch {}
  };

  // --- Render ---
  if (loading) return <MainLayout><p>{t("loading", { ns: "common" })}</p></MainLayout>;

  return (
    <MainLayout>
      <Card
        title={t("title")}
        action={
          <Button onClick={() => crud.openCreate()}>
            <Plus className="h-4 w-4 mr-1" />{t("actions.add", { ns: "common" })}
          </Button>
        }
      >
        <TableToolbar
          filterTerm={filterTerm}
          onFilterChange={setFilterTerm}
          placeholder={t("actions.search", { ns: "common" })}
          onExport={() => exportToExcel(filteredData, "{Entity}s", "{entity}s")}
          settingsOpen={ts.settingsOpen}
          onOpenSettings={ts.openSettings}
          onApplySettings={ts.applySettings}
          onCancelSettings={ts.cancelSettings}
          draftRowsPerPage={ts.draftRowsPerPage}
          onDraftRowsPerPageChange={ts.setDraftRowsPerPage}
          toggleableColumns={toggleableColumns}
          draftVisibleColumns={ts.draftVisibleColumns}
          onToggleDraftColumn={ts.toggleDraftColumn}
          draftColumnOrder={ts.draftColumnOrder}
          onMoveDraftColumn={ts.moveDraftColumn}
          allColumnHeaders={Object.fromEntries(allColumns.map((c) => [c.key, c.header]))}
        />
        <DataTable
          columns={columns}
          data={filteredData}
          pageSize={ts.rowsPerPage}
          onRowClick={(item) => router.push(`/{entity}s/${item.id}`)}
          emptyMessage={t("empty", { ns: "common" })}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        open={crud.modalOpen}
        onClose={() => crud.close()}
        title={crud.editItem ? t("modal.titleEdit") : t("modal.titleCreate")}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t("modal.nom")}</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={crud.form.nom}
              onChange={(e) => crud.setForm({ ...crud.form, nom: e.target.value })}
            />
          </div>
          {/* Add more form fields here */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => crud.close()}>
              {t("actions.cancel", { ns: "common" })}
            </Button>
            <Button onClick={handleSubmit}>
              {t("actions.save", { ns: "common" })}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDeleteModal
        open={del.isOpen}
        onConfirm={handleDelete}
        onCancel={() => del.cancel()}
        itemLabel={del.target?.nom}
      />
    </MainLayout>
  );
}
```

---

## Detail Page Template

```typescript
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "next/navigation";

import MainLayout from "@/components/layout/MainLayout";
import Tabs from "@/components/ui/Tabs";

import type { {Entity}, Child } from "@/types";
import * as api from "@/lib/api";

export default function {Entity}DetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation(["{entity}s", "common"]);

  // --- Shared state (passed to all tabs) ---
  const [entity, setEntity] = useState<{Entity} | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const initialLoadDone = useRef(false);

  // --- Central fetch function ---
  const fetchAll = useCallback(async () => {
    if (!initialLoadDone.current) setLoading(true);

    const results = await Promise.allSettled([
      api.get{Entity}(id),         // primary — must succeed
      api.getChildren(id),          // secondary — fallback to []
    ]);

    const [entityRes, childrenRes] = results;

    // Primary: fail hard
    if (entityRes.status === "rejected") {
      setEntity(null);
      setLoading(false);
      return;
    }

    // Secondary: fallback to empty array
    setEntity(entityRes.value.data);
    setChildren(childrenRes.status === "fulfilled" ? childrenRes.value.data : []);

    setLoading(false);
    initialLoadDone.current = true;
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // --- Render ---
  if (loading) return <MainLayout><p>{t("loading", { ns: "common" })}</p></MainLayout>;
  if (!entity) return <MainLayout><p>{t("notFound", { ns: "common" })}</p></MainLayout>;

  return (
    <MainLayout>
      <h1 className="text-2xl font-bold mb-4">{entity.nom}</h1>

      <Tabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={[
          { id: "overview", label: t("detail.tabs.overview") },
          { id: "children", label: t("detail.tabs.children") },
        ]}
      />

      {activeTab === "overview" && (
        <OverviewTab entity={entity} onRefresh={fetchAll} />
      )}
      {activeTab === "children" && (
        <ChildrenTab entityId={id} children={children} onRefresh={fetchAll} />
      )}
    </MainLayout>
  );
}
```

---

## Tab Component Template

```typescript
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";

import Card from "@/components/ui/Card";
import DataTable from "@/components/ui/DataTable";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import ConfirmDeleteModal from "@/components/ui/ConfirmDeleteModal";
import TableToolbar from "@/components/ui/TableToolbar";

import { useTableSettings } from "@/hooks/useTableSettings";
import { useCrudModal } from "@/hooks/useCrudModal";
import { useDeleteConfirm } from "@/hooks/useDeleteConfirm";

import type { Child } from "@/types";
import type { Column } from "@/components/ui/DataTable";

import * as api from "@/lib/api";

interface {TabName}TabProps {
  /** Parent entity ID — used for scoped API calls */
  entityId: string;
  /** Child data passed from parent detail page */
  children: Child[];
  /** Callback to trigger full data refetch in parent */
  onRefresh: () => void;
}

const defaultForm = { nom: "", description: "" };

export default function {TabName}Tab({ entityId, children, onRefresh }: {TabName}TabProps) {
  const { t } = useTranslation(["{entity}s", "common", "enums"]);

  // --- Internal state (not shared with parent) ---
  const crud = useCrudModal<Child, typeof defaultForm>(
    defaultForm,
    (item) => ({ nom: item.nom, description: item.description })
  );
  const del = useDeleteConfirm<Child>();
  const [filterTerm, setFilterTerm] = useState("");
  const ts = useTableSettings(["nom"], 10, ["nom", "actions"], "{entity}-{tabname}");

  // --- Derived data ---
  const filteredData = useMemo(() =>
    children.filter((c) => c.nom.toLowerCase().includes(filterTerm.toLowerCase())),
    [children, filterTerm]
  );

  // --- Columns ---
  const allColumns: Column<Child>[] = useMemo(() => [
    { key: "nom", header: t("childColumns.nom"), sortable: true },
    {
      key: "actions", header: "",
      render: (item) => (
        <div className="flex gap-1">
          <button onClick={(ev) => { ev.stopPropagation(); crud.openEdit(item); }}>
            <Pencil className="h-4 w-4 text-indigo-600 hover:text-indigo-800" />
          </button>
          <button onClick={(ev) => { ev.stopPropagation(); del.requestDelete(item); }}>
            <Trash2 className="h-4 w-4 text-red-500 hover:text-red-700" />
          </button>
        </div>
      ),
    },
  ], [t, crud, del]);

  // --- CRUD handlers ---
  const handleSubmit = async () => {
    try {
      if (crud.editItem) {
        await api.updateChild(entityId, crud.editItem.id, crud.form);
      } else {
        await api.createChild(entityId, crud.form);
      }
      crud.close();
      onRefresh(); // Tell parent to refetch all data
    } catch {}
  };

  const handleDelete = async () => {
    try {
      await api.deleteChild(entityId, del.target!.id);
      del.cancel();
      onRefresh();
    } catch {}
  };

  // --- Render ---
  return (
    <Card
      title={t("detail.children.title")}
      action={
        <Button onClick={() => crud.openCreate()}>
          <Plus className="h-4 w-4 mr-1" />{t("actions.add", { ns: "common" })}
        </Button>
      }
    >
      <TableToolbar
        filterTerm={filterTerm}
        onFilterChange={setFilterTerm}
        placeholder={t("actions.search", { ns: "common" })}
        settingsOpen={ts.settingsOpen}
        onOpenSettings={ts.openSettings}
        onApplySettings={ts.applySettings}
        onCancelSettings={ts.cancelSettings}
        draftRowsPerPage={ts.draftRowsPerPage}
        onDraftRowsPerPageChange={ts.setDraftRowsPerPage}
        toggleableColumns={allColumns.filter((c) => c.key !== "nom" && c.key !== "actions")}
        draftVisibleColumns={ts.draftVisibleColumns}
        onToggleDraftColumn={ts.toggleDraftColumn}
        draftColumnOrder={ts.draftColumnOrder}
        onMoveDraftColumn={ts.moveDraftColumn}
        allColumnHeaders={Object.fromEntries(allColumns.map((c) => [c.key, c.header]))}
      />
      <DataTable columns={allColumns} data={filteredData} pageSize={ts.rowsPerPage} />

      {/* Create/Edit Modal */}
      <Modal
        open={crud.modalOpen}
        onClose={() => crud.close()}
        title={crud.editItem ? t("detail.children.edit") : t("detail.children.create")}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t("detail.children.nom")}</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={crud.form.nom}
              onChange={(e) => crud.setForm({ ...crud.form, nom: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => crud.close()}>
              {t("actions.cancel", { ns: "common" })}
            </Button>
            <Button onClick={handleSubmit}>{t("actions.save", { ns: "common" })}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDeleteModal
        open={del.isOpen}
        onConfirm={handleDelete}
        onCancel={() => del.cancel()}
        itemLabel={del.target?.nom}
      />
    </Card>
  );
}
```

---

## M:N Linking Pattern (add to any tab that needs associations)

```typescript
// --- Linking state ---
const [linkModalOpen, setLinkModalOpen] = useState(false);
const [linkTarget, setLinkTarget] = useState<Parent | null>(null);
const [selectedIds, setSelectedIds] = useState<string[]>([]);

// --- Derived: already-linked vs available candidates ---
const linkedIds = useMemo(
  () => new Set(associations.map((a) => a.childId)),
  [associations]
);
const candidates = useMemo(
  () => allChildren.filter((c) => !linkedIds.has(c.id)),
  [allChildren, linkedIds]
);

// --- Open link modal ---
const openLinkModal = (parent: Parent) => {
  setLinkTarget(parent);
  setSelectedIds([]);
  setLinkModalOpen(true);
};

// --- Link selected items ---
const handleLink = async () => {
  for (const id of selectedIds) {
    await api.linkChildToParent(linkTarget!.id, id);
  }
  setLinkModalOpen(false);
  onRefresh();
};

// --- Unlink a single item ---
const handleUnlink = async (associationId: string) => {
  await api.unlinkChildFromParent(associationId);
  onRefresh();
};
```

---

## Custom Hook Template

```typescript
import { useState, useCallback, useMemo } from "react";

interface Use{HookName}Props {
  /** Description of what this prop controls */
  items: Item[];
  /** API callback for create — injected by consumer (dependency injection) */
  onCreate: (data: ItemForm) => Promise<unknown>;
  /** API callback for update */
  onUpdate: (id: string, data: ItemForm) => Promise<unknown>;
  /** API callback for delete */
  onDelete: (id: string) => Promise<unknown>;
  /** Refresh callback from parent */
  onRefresh: () => void;
}

interface Use{HookName}Return {
  // Expose only what consumers need
  modalOpen: boolean;
  editItem: Item | null;
  form: ItemForm;
  setForm: (form: ItemForm) => void;
  openCreate: () => void;
  openEdit: (item: Item) => void;
  close: () => void;
  handleSubmit: () => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
}

const defaultForm: ItemForm = { nom: "", description: "" };

export function use{HookName}({
  items,
  onCreate,
  onUpdate,
  onDelete,
  onRefresh,
}: Use{HookName}Props): Use{HookName}Return {
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [form, setForm] = useState<ItemForm>(defaultForm);

  const openCreate = useCallback(() => {
    setEditItem(null);
    setForm(defaultForm);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((item: Item) => {
    setEditItem(item);
    setForm({ nom: item.nom, description: item.description });
    setModalOpen(true);
  }, []);

  const close = useCallback(() => {
    setModalOpen(false);
    setEditItem(null);
    setForm(defaultForm);
  }, []);

  const handleSubmit = useCallback(async () => {
    try {
      if (editItem) {
        await onUpdate(editItem.id, form);
      } else {
        await onCreate(form);
      }
      close();
      onRefresh();
    } catch {}
  }, [editItem, form, onCreate, onUpdate, close, onRefresh]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await onDelete(id);
      onRefresh();
    } catch {}
  }, [onDelete, onRefresh]);

  return { modalOpen, editItem, form, setForm, openCreate, openEdit, close, handleSubmit, handleDelete };
}
```

---

## Translation File Template

Create in `src/i18n/locales/{en,fr,de}/{entity}s.json`:

```json
{
  "title": "{Entity}s",
  "columns.nom": "Name",
  "columns.statut": "Status",
  "columns.description": "Description",
  "modal.titleCreate": "Create {Entity}",
  "modal.titleEdit": "Edit {Entity}",
  "modal.nom": "Name",
  "modal.description": "Description",
  "detail.tabs.overview": "Overview",
  "detail.tabs.children": "Children",
  "detail.children.title": "Children",
  "detail.children.create": "Add Child",
  "detail.children.edit": "Edit Child",
  "detail.children.nom": "Name"
}
```

Remember to import the new namespace in `src/lib/i18n.tsx` and add it to the `ns` array in the i18next init configuration.

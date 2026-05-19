import React, { useState, useCallback, useRef } from "react";

const FIELD_TYPES = [
  { type: "text", label: "Text field", icon: "📝", schema: { type: "string" }, uiWidget: "text" },
  { type: "textarea", label: "Textarea", icon: "📄", schema: { type: "string" }, uiWidget: "textarea" },
  { type: "email", label: "Email", icon: "✉️", schema: { type: "string", format: "email" }, uiWidget: "email" },
  { type: "number", label: "Number", icon: "🔢", schema: { type: "number" }, uiWidget: "number" },
  { type: "select", label: "Select", icon: "📋", schema: { type: "string", enum: ["Option 1", "Option 2", "Option 3"] }, uiWidget: "select" },
  { type: "radio", label: "Radio group", icon: "🔘", schema: { type: "string", enum: ["Option A", "Option B"] }, uiWidget: "radio" },
  { type: "checkbox", label: "Checkbox", icon: "☑️", schema: { type: "boolean" }, uiWidget: "checkbox" },
  { type: "date", label: "Date", icon: "📅", schema: { type: "string", format: "date" }, uiWidget: "date" },
  { type: "url", label: "URL", icon: "🔗", schema: { type: "string", format: "uri" }, uiWidget: "url" },
  { type: "password", label: "Password", icon: "🔒", schema: { type: "string" }, uiWidget: "password" },
];

let idCounter = 1;
const uid = () => `field_${idCounter++}`;

const DEFAULT_FIELDS = [
  { id: uid(), type: "text", label: "Full name", key: "fullName", required: true, placeholder: "John Doe", description: "", schema: { type: "string" }, uiWidget: "text" },
  { id: uid(), type: "email", label: "Email address", key: "email", required: true, placeholder: "user@example.com", description: "", schema: { type: "string", format: "email" }, uiWidget: "email" },
  { id: uid(), type: "select", label: "Role", key: "role", required: false, placeholder: "", description: "User's system role", schema: { type: "string", enum: ["admin", "user", "guest"] }, uiWidget: "select", enumLabels: ["Admin", "User", "Guest"] },
];

function makeField(typeDef) {
  return {
    id: uid(),
    type: typeDef.type,
    label: typeDef.label,
    key: typeDef.type + "_" + Math.random().toString(36).slice(2, 6),
    required: false,
    placeholder: "",
    description: "",
    schema: { ...typeDef.schema },
    uiWidget: typeDef.uiWidget,
    enumLabels: typeDef.schema.enum ? [...typeDef.schema.enum] : undefined,
  };
}

function buildJsonSchema(fields) {
  const properties = {};
  const required = [];
  fields.forEach(f => {
    const s = { ...f.schema };
    if (f.label) s.title = f.label;
    if (f.description) s.description = f.description;
    if (f.placeholder) s["ui:placeholder"] = f.placeholder;
    properties[f.key] = s;
    if (f.required) required.push(f.key);
  });
  return { type: "object", properties, ...(required.length ? { required } : {}) };
}

// Draggable chip in palette
function PaletteChip({ typeDef, onDragStart }) {
  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.setData("palette", typeDef.type); onDragStart(typeDef); }}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "7px 10px", marginBottom: 4,
        border: "1px solid #2a2a2a", borderRadius: 7,
        background: "#111", cursor: "grab", fontSize: 12,
        color: "#ccc", userSelect: "none", transition: "all .15s",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = "#1a1a1a"; e.currentTarget.style.borderColor = "#444"; e.currentTarget.style.color = "#fff"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "#111"; e.currentTarget.style.borderColor = "#2a2a2a"; e.currentTarget.style.color = "#ccc"; }}
    >
      <span style={{ fontSize: 14 }}>{typeDef.icon}</span>
      <span style={{ flex: 1 }}>{typeDef.label}</span>
      <span style={{ fontSize: 10, padding: "1px 6px", background: "#1d1d1d", border: "1px solid #333", borderRadius: 4, color: "#666", fontFamily: "monospace" }}>
        {typeDef.schema.type}
      </span>
    </div>
  );
}

// Field in the canvas
function CanvasField({ field, selected, onSelect, onDelete, onDuplicate, onDragStart, onDragOver, onDrop, index }) {
  const [hovering, setHovering] = useState(false);
  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.setData("canvas", index); onDragStart(index); }}
      onDragOver={e => { e.preventDefault(); onDragOver(index); }}
      onDrop={e => { e.preventDefault(); onDrop(index); }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onClick={() => onSelect(field.id)}
      style={{
        border: selected ? "1.5px solid #4a9eff" : hovering ? "1px solid #333" : "1px solid #222",
        borderRadius: 8, padding: "10px 12px", marginBottom: 6,
        background: selected ? "#0d1f33" : "#111",
        cursor: "pointer", position: "relative", transition: "all .12s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 10, color: "#555", cursor: "grab" }}>⠿</span>
        <span style={{ fontSize: 12, fontWeight: 500, color: selected ? "#7dc4ff" : "#aaa" }}>{field.label}</span>
        {field.required && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#e05252", display: "inline-block" }} />}
        <span style={{ marginLeft: "auto", fontSize: 10, color: "#444", fontFamily: "monospace" }}>{field.key}</span>
      </div>
      <FieldPreview field={field} />
      {(hovering || selected) && (
        <div style={{ position: "absolute", top: 6, right: 6, display: "flex", gap: 4 }}>
          <ActionBtn onClick={e => { e.stopPropagation(); onDuplicate(field.id); }}>⧉</ActionBtn>
          <ActionBtn onClick={e => { e.stopPropagation(); onDelete(field.id); }} danger>✕</ActionBtn>
        </div>
      )}
    </div>
  );
}

function ActionBtn({ onClick, children, danger }) {
  return (
    <button onClick={onClick} style={{
      width: 20, height: 20, borderRadius: 4, background: danger ? "#2a1111" : "#1a1a1a",
      border: `1px solid ${danger ? "#5a2222" : "#333"}`, color: danger ? "#e05252" : "#666",
      display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
      fontSize: 11, padding: 0, lineHeight: 1,
    }}>
      {children}
    </button>
  );
}

function FieldPreview({ field }) {
  const base = {
    width: "100%", height: 28, background: "#0d0d0d", border: "1px solid #2a2a2a",
    borderRadius: 5, padding: "0 8px", fontSize: 12, color: "#555",
    display: "flex", alignItems: "center",
  };
  if (field.uiWidget === "textarea") return <div style={{ ...base, height: 48, alignItems: "flex-start", padding: "6px 8px" }}>{field.placeholder || "…"}</div>;
  if (field.uiWidget === "checkbox") return <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 14, height: 14, background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 3 }} /><span style={{ fontSize: 12, color: "#555" }}>{field.label}</span></div>;
  if (field.uiWidget === "select") return <div style={{ ...base, justifyContent: "space-between" }}><span>{field.placeholder || "Select…"}</span><span>▾</span></div>;
  if (field.uiWidget === "radio") return (
    <div style={{ display: "flex", gap: 10 }}>
      {(field.schema.enum || []).slice(0, 3).map((v, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#0d0d0d", border: "1px solid #333" }} />
          <span style={{ fontSize: 11, color: "#555" }}>{(field.enumLabels || [])[i] || v}</span>
        </div>
      ))}
    </div>
  );
  return <div style={base}>{field.placeholder || "…"}</div>;
}

// Tree node
function TreeNode({ field, selected, onClick, depth = 0 }) {
  const icons = { text: "T", textarea: "¶", email: "@", number: "#", select: "▾", radio: "◎", checkbox: "☑", date: "📅", url: "🔗", password: "🔒" };
  return (
    <div
      onClick={() => onClick(field.id)}
      style={{
        display: "flex", alignItems: "center", gap: 5, padding: "4px 6px",
        paddingLeft: 6 + depth * 14, borderRadius: 5, cursor: "pointer", fontSize: 12,
        background: selected ? "#0d1f33" : "transparent",
        color: selected ? "#7dc4ff" : "#888",
        transition: "all .1s",
        marginBottom: 1,
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = "#151515"; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = "transparent"; }}
    >
      <span style={{ fontSize: 10, color: selected ? "#4a9eff" : "#444", width: 14, textAlign: "center" }}>{icons[field.type] || "□"}</span>
      <span style={{ flex: 1 }}>{field.label}</span>
      <span style={{ fontSize: 10, fontFamily: "monospace", color: selected ? "#4a9eff" : "#444", background: selected ? "#0a1a2e" : "#111", padding: "1px 5px", borderRadius: 3, border: `1px solid ${selected ? "#1a3a5e" : "#222"}` }}>
        {field.schema.type}{field.schema.enum ? " enum" : ""}
      </span>
    </div>
  );
}

// Properties panel
function PropertiesPanel({ field, onChange }) {
  if (!field) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#333", fontSize: 13 }}>
      Select a field to edit
    </div>
  );

  const update = (key, val) => onChange({ ...field, [key]: val });
  const updateSchema = (key, val) => onChange({ ...field, schema: { ...field.schema, [key]: val } });

  const inputStyle = {
    width: "100%", background: "#0d0d0d", border: "1px solid #2a2a2a", borderRadius: 5,
    color: "#ccc", fontSize: 12, padding: "5px 8px", outline: "none", fontFamily: "inherit",
  };

  const Label = ({ children }) => <div style={{ fontSize: 10, color: "#555", marginBottom: 3, marginTop: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>{children}</div>;

  const hasEnum = field.schema.type === "string" && (field.uiWidget === "select" || field.uiWidget === "radio");

  return (
    <div style={{ flex: 1, overflow: "auto", padding: "10px 12px", fontSize: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid #1a1a1a" }}>
        <span style={{ fontSize: 16 }}>{FIELD_TYPES.find(t => t.type === field.type)?.icon}</span>
        <span style={{ fontWeight: 500, color: "#bbb" }}>{FIELD_TYPES.find(t => t.type === field.type)?.label}</span>
        <code style={{ marginLeft: "auto", fontSize: 10, color: "#555", background: "#111", padding: "2px 6px", borderRadius: 4, border: "1px solid #222" }}>{field.schema.type}</code>
      </div>

      <Label>Label</Label>
      <input style={inputStyle} value={field.label} onChange={e => update("label", e.target.value)} />

      <Label>Key (JSON property)</Label>
      <input style={{ ...inputStyle, fontFamily: "monospace", color: "#7dc4ff" }} value={field.key} onChange={e => update("key", e.target.value.replace(/\s/g, "_").replace(/[^a-zA-Z0-9_]/g, ""))} />

      <Label>Placeholder</Label>
      <input style={inputStyle} value={field.placeholder || ""} onChange={e => update("placeholder", e.target.value)} />

      <Label>Description / help text</Label>
      <input style={inputStyle} value={field.description || ""} onChange={e => update("description", e.target.value)} />

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: "#888", fontSize: 12 }}>
          <input type="checkbox" checked={field.required} onChange={e => update("required", e.target.checked)} style={{ accentColor: "#4a9eff" }} />
          Required
        </label>
      </div>

      {field.schema.type === "number" && (
        <>
          <Label>Min value</Label>
          <input type="number" style={inputStyle} value={field.schema.minimum ?? ""} onChange={e => updateSchema("minimum", e.target.value ? Number(e.target.value) : undefined)} />
          <Label>Max value</Label>
          <input type="number" style={inputStyle} value={field.schema.maximum ?? ""} onChange={e => updateSchema("maximum", e.target.value ? Number(e.target.value) : undefined)} />
        </>
      )}

      {field.schema.type === "string" && !hasEnum && (
        <>
          <Label>Min length</Label>
          <input type="number" style={inputStyle} value={field.schema.minLength ?? ""} onChange={e => updateSchema("minLength", e.target.value ? Number(e.target.value) : undefined)} />
          <Label>Max length</Label>
          <input type="number" style={inputStyle} value={field.schema.maxLength ?? ""} onChange={e => updateSchema("maxLength", e.target.value ? Number(e.target.value) : undefined)} />
          <Label>Pattern (regex)</Label>
          <input style={{ ...inputStyle, fontFamily: "monospace" }} value={field.schema.pattern ?? ""} onChange={e => updateSchema("pattern", e.target.value || undefined)} placeholder="^[a-z]+$" />
        </>
      )}

      {hasEnum && (
        <>
          <div style={{ display: "flex", alignItems: "center", marginTop: 12, marginBottom: 6 }}>
            <span style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.06em" }}>Enum options</span>
            <button
              onClick={() => {
                const newVal = [...(field.schema.enum || []), `option_${(field.schema.enum || []).length + 1}`];
                const newLabels = [...(field.enumLabels || []), `Option ${(field.enumLabels || []).length + 1}`];
                onChange({ ...field, schema: { ...field.schema, enum: newVal }, enumLabels: newLabels });
              }}
              style={{ marginLeft: "auto", fontSize: 11, color: "#4a9eff", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >+ Add</button>
          </div>
          {(field.schema.enum || []).map((val, i) => (
            <div key={i} style={{ display: "flex", gap: 5, marginBottom: 4, alignItems: "center" }}>
              <input
                style={{ ...inputStyle, fontFamily: "monospace", flex: 1, color: "#7dc4ff", fontSize: 11 }}
                value={val}
                placeholder="value"
                onChange={e => {
                  const newEnum = [...field.schema.enum]; newEnum[i] = e.target.value;
                  updateSchema("enum", newEnum);
                }}
              />
              <input
                style={{ ...inputStyle, flex: 1, fontSize: 11 }}
                value={(field.enumLabels || [])[i] || ""}
                placeholder="label"
                onChange={e => {
                  const nl = [...(field.enumLabels || field.schema.enum)]; nl[i] = e.target.value;
                  update("enumLabels", nl);
                }}
              />
              <button
                onClick={() => {
                  const newEnum = field.schema.enum.filter((_, j) => j !== i);
                  const newLabels = (field.enumLabels || []).filter((_, j) => j !== i);
                  onChange({ ...field, schema: { ...field.schema, enum: newEnum }, enumLabels: newLabels });
                }}
                style={{ color: "#e05252", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}
              >✕</button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// Live form renderer
function FormRenderer({ fields, formData, onChange }) {
  const inputStyle = {
    width: "100%", background: "#0d0d0d", border: "1px solid #2a2a2a",
    borderRadius: 5, color: "#ccc", fontSize: 13, padding: "7px 10px",
    outline: "none", fontFamily: "inherit", transition: "border-color .15s",
  };
  const onFocus = e => e.target.style.borderColor = "#4a9eff";
  const onBlur = e => e.target.style.borderColor = "#2a2a2a";

  return (
    <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
      {fields.map(field => (
        <div key={field.id}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#888", marginBottom: 5 }}>
            {field.label}
            {field.required && <span style={{ color: "#e05252", marginLeft: 3 }}>*</span>}
            {field.description && <span style={{ color: "#444", fontSize: 11, fontWeight: 400, marginLeft: 6 }}>{field.description}</span>}
          </label>
          {field.uiWidget === "textarea" ? (
            <textarea style={{ ...inputStyle, height: 72, resize: "vertical" }} placeholder={field.placeholder} value={formData[field.key] || ""} onChange={e => onChange({ ...formData, [field.key]: e.target.value })} onFocus={onFocus} onBlur={onBlur} />
          ) : field.uiWidget === "checkbox" ? (
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={!!formData[field.key]} onChange={e => onChange({ ...formData, [field.key]: e.target.checked })} style={{ accentColor: "#4a9eff", width: 15, height: 15 }} />
              <span style={{ fontSize: 13, color: "#666" }}>{field.label}</span>
            </label>
          ) : field.uiWidget === "select" ? (
            <select style={{ ...inputStyle, cursor: "pointer" }} value={formData[field.key] || ""} onChange={e => onChange({ ...formData, [field.key]: e.target.value })} onFocus={onFocus} onBlur={onBlur}>
              <option value="">Select…</option>
              {(field.schema.enum || []).map((v, i) => <option key={v} value={v}>{(field.enumLabels || [])[i] || v}</option>)}
            </select>
          ) : field.uiWidget === "radio" ? (
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {(field.schema.enum || []).map((v, i) => (
                <label key={v} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, color: "#888" }}>
                  <input type="radio" name={field.key} value={v} checked={formData[field.key] === v} onChange={() => onChange({ ...formData, [field.key]: v })} style={{ accentColor: "#4a9eff" }} />
                  {(field.enumLabels || [])[i] || v}
                </label>
              ))}
            </div>
          ) : (
            <input type={field.uiWidget === "password" ? "password" : field.uiWidget === "email" ? "email" : field.uiWidget === "number" ? "number" : field.uiWidget === "date" ? "date" : field.uiWidget === "url" ? "url" : "text"} style={inputStyle} placeholder={field.placeholder} value={formData[field.key] || ""} onChange={e => onChange({ ...formData, [field.key]: e.target.value })} onFocus={onFocus} onBlur={onBlur} min={field.schema.minimum} max={field.schema.maximum} minLength={field.schema.minLength} maxLength={field.schema.maxLength} />
          )}
        </div>
      ))}
      {fields.length === 0 && (
        <div style={{ textAlign: "center", color: "#333", fontSize: 13, padding: "40px 0" }}>
          Drop fields here to build your form
        </div>
      )}
    </div>
  );
}

const PANEL_HEADER = ({ children, extra }) => (
  <div style={{ padding: "8px 12px", fontSize: 10, fontWeight: 500, color: "#444", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
    {children}
    {extra && <span style={{ marginLeft: "auto" }}>{extra}</span>}
  </div>
);

export function AdminEditorExample() {
  const [fields, setFields] = useState(DEFAULT_FIELDS);
  const [selectedId, setSelectedId] = useState(null);
  const [activeTab, setActiveTab] = useState("preview"); // preview | json | output
  const [formData, setFormData] = useState({});
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const draggingCanvas = useRef(null);
  const draggingPalette = useRef(null);

  const selectedField = fields.find(f => f.id === selectedId);

  const handlePaletteDragStart = (typeDef) => { draggingPalette.current = typeDef; draggingCanvas.current = null; };
  const handleCanvasDragStart = (idx) => { draggingCanvas.current = idx; draggingPalette.current = null; };

  const handleCanvasDrop = (targetIdx) => {
    if (draggingPalette.current) {
      const newField = makeField(draggingPalette.current);
      const next = [...fields];
      next.splice(targetIdx, 0, newField);
      setFields(next);
      setSelectedId(newField.id);
    } else if (draggingCanvas.current !== null && draggingCanvas.current !== targetIdx) {
      const next = [...fields];
      const [moved] = next.splice(draggingCanvas.current, 1);
      next.splice(targetIdx, 0, moved);
      setFields(next);
    }
    setDragOverIdx(null);
    draggingPalette.current = null;
    draggingCanvas.current = null;
  };

  const handleDropZone = (e) => {
    e.preventDefault();
    if (draggingPalette.current) {
      const newField = makeField(draggingPalette.current);
      setFields(prev => [...prev, newField]);
      setSelectedId(newField.id);
    }
    draggingPalette.current = null;
    draggingCanvas.current = null;
    setDragOverIdx(null);
  };

  const deleteField = (id) => {
    setFields(prev => prev.filter(f => f.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const duplicateField = (id) => {
    const idx = fields.findIndex(f => f.id === id);
    const orig = fields[idx];
    const copy = { ...orig, id: uid(), key: orig.key + "_copy", label: orig.label + " (copy)", schema: { ...orig.schema } };
    const next = [...fields];
    next.splice(idx + 1, 0, copy);
    setFields(next);
    setSelectedId(copy.id);
  };

  const updateField = useCallback((updated) => {
    setFields(prev => prev.map(f => f.id === updated.id ? updated : f));
  }, []);

  const schema = buildJsonSchema(fields);

  const Tab = ({ id, children }) => (
    <button onClick={() => setActiveTab(id)} style={{
      fontSize: 12, padding: "7px 12px", background: "none", border: "none",
      cursor: "pointer", color: activeTab === id ? "#7dc4ff" : "#444",
      borderBottom: `2px solid ${activeTab === id ? "#4a9eff" : "transparent"}`,
      transition: "all .12s", fontFamily: "inherit",
    }}>
      {children}
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0a0a0a", color: "#ccc", fontFamily: "'DM Mono', 'Fira Code', monospace", fontSize: 13, overflow: "hidden" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", padding: "0 16px", height: 42, borderBottom: "1px solid #1a1a1a", background: "#0d0d0d", flexShrink: 0, gap: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "#ccc", letterSpacing: "0.02em" }}>⬡ Schema Builder</span>
        <div style={{ width: 1, height: 16, background: "#2a2a2a", margin: "0 4px" }} />
        <span style={{ fontSize: 11, color: "#444" }}>{fields.length} field{fields.length !== 1 ? "s" : ""}</span>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => { setFields([]); setSelectedId(null); setFormData({}); }}
          style={{ fontSize: 11, color: "#555", background: "none", border: "1px solid #222", borderRadius: 5, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit" }}
        >Clear</button>
        <button
          onClick={() => { const blob = new Blob([JSON.stringify(schema, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "schema.json"; a.click(); }}
          style={{ fontSize: 11, color: "#4a9eff", background: "#0d1f33", border: "1px solid #1a3a5e", borderRadius: 5, padding: "4px 12px", cursor: "pointer", fontFamily: "inherit" }}
        >↓ Export schema</button>
      </div>

      {/* Main layout */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Left: Palette */}
        <div style={{ width: 210, borderRight: "1px solid #1a1a1a", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <PANEL_HEADER>Input types</PANEL_HEADER>
          <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
            {FIELD_TYPES.map(t => (
              <PaletteChip key={t.type} typeDef={t} onDragStart={handlePaletteDragStart} />
            ))}
          </div>
        </div>

        {/* Center: Canvas + Tree */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid #1a1a1a", background: "#0d0d0d", flexShrink: 0 }}>
            <Tab id="preview">Form preview</Tab>
            <Tab id="json">JSON Schema</Tab>
            <Tab id="output">Form output</Tab>
          </div>

          {/* Canvas area */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {activeTab === "preview" && (
              <div style={{ padding: "12px 16px" }}>
                {fields.map((field, idx) => (
                  <CanvasField
                    key={field.id}
                    field={field}
                    index={idx}
                    selected={selectedId === field.id}
                    onSelect={setSelectedId}
                    onDelete={deleteField}
                    onDuplicate={duplicateField}
                    onDragStart={handleCanvasDragStart}
                    onDragOver={(i) => setDragOverIdx(i)}
                    onDrop={handleCanvasDrop}
                  />
                ))}
                <div
                  onDragOver={e => e.preventDefault()}
                  onDrop={handleDropZone}
                  style={{
                    border: `2px dashed ${dragOverIdx === fields.length ? "#4a9eff" : "#1a1a1a"}`,
                    borderRadius: 8, padding: "16px", textAlign: "center",
                    fontSize: 12, color: "#333", marginTop: 4, transition: "all .15s",
                    cursor: "default",
                  }}
                >
                  ＋ drop field here
                </div>
              </div>
            )}
            {activeTab === "json" && (
              <pre style={{ padding: "16px 20px", fontSize: 11, color: "#7dc4ff", fontFamily: "monospace", lineHeight: 1.6, overflowX: "auto" }}>
                {JSON.stringify(schema, null, 2)
                  .replace(/"(\w+)":/g, (_, k) => `"<span style="color:#e8b45a">${k}</span>":`)
                }
                {JSON.stringify(schema, null, 2)}
              </pre>
            )}
            {activeTab === "output" && (
              <div>
                <FormRenderer fields={fields} formData={formData} onChange={setFormData} />
                {fields.length > 0 && (
                  <div style={{ margin: "0 20px 20px", padding: 12, background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 7 }}>
                    <div style={{ fontSize: 10, color: "#444", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Form data JSON</div>
                    <pre style={{ fontSize: 11, color: "#7dc4ff", fontFamily: "monospace", lineHeight: 1.5 }}>{JSON.stringify(formData, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom: Schema tree */}
          <div style={{ height: 180, borderTop: "1px solid #1a1a1a", display: "flex", flexDirection: "column", flexShrink: 0 }}>
            <PANEL_HEADER>
              Schema tree
              <span style={{ marginLeft: "auto", fontSize: 10, fontFamily: "monospace", color: "#333" }}>object</span>
            </PANEL_HEADER>
            <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 6px", fontSize: 12, color: "#555" }}>
                <span>▾</span><span style={{ color: "#666" }}>root</span><code style={{ marginLeft: "auto", fontSize: 10, color: "#333", background: "#111", padding: "1px 4px", borderRadius: 3, border: "1px solid #1a1a1a" }}>object</code>
              </div>
              {fields.map(f => (
                <TreeNode key={f.id} field={f} selected={selectedId === f.id} onClick={setSelectedId} depth={1} />
              ))}
            </div>
          </div>
        </div>

        {/* Right: Properties */}
        <div style={{ width: 260, borderLeft: "1px solid #1a1a1a", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <PANEL_HEADER>Properties</PANEL_HEADER>
          <PropertiesPanel field={selectedField} onChange={updateField} />
        </div>
      </div>
    </div>
  );
}
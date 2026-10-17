import React from 'react';
import { ESTADOS, PRIORIDADES } from '../constants.js';

function Select({ label, name, value, onChange, options }) {
  return (
    <label>
      {label}
      <select name={name} value={value} onChange={(e) => onChange(name, e.target.value)}>
        <option value="">Todos</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

export default function Filters({ filters, onChange, categories, technicians }) {
  const simple = (list) => list.map((v) => ({ value: v, label: v }));
  return (
    <form className="filters" onSubmit={(e) => e.preventDefault()}>
      <Select label="Estado" name="estado" value={filters.estado} onChange={onChange} options={simple(ESTADOS)} />
      <Select label="Prioridad" name="prioridad" value={filters.prioridad} onChange={onChange} options={simple(PRIORIDADES)} />
      <Select
        label="Categoría"
        name="category_id"
        value={filters.category_id}
        onChange={onChange}
        options={categories.map((c) => ({ value: String(c.id), label: c.nombre }))}
      />
      <Select
        label="Técnico"
        name="tecnico_id"
        value={filters.tecnico_id}
        onChange={onChange}
        options={technicians.map((t) => ({ value: String(t.id), label: t.nombre }))}
      />
    </form>
  );
}

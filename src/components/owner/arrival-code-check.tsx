"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { DemoNotice } from "@/components/ui/demo-notice";
import { inputClass } from "./form-fields";

/**
 * Formulario para validar el código de llegada de un conductor.
 * En la demo nunca valida: responde siempre que la función no está disponible
 * (no se simula una validación exitosa).
 */
export function ArrivalCodeCheck() {
  const id = useId();
  const [code, setCode] = useState("");
  const [answered, setAnswered] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAnswered(true);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
      <label htmlFor={id} className="text-sm font-medium text-ink-900">
        Código que te muestra el conductor
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={id}
          className={`${inputClass} sm:max-w-xs`}
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setAnswered(false);
          }}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="Ingresá el código"
        />
        <Button type="submit" variant="secondary">
          Validar código
        </Button>
      </div>
      <div role="status" aria-live="polite">
        {answered && (
          <DemoNotice title="La validación de códigos no está disponible en la demo">
            No se verificó ningún código. En la versión real vas a ver si corresponde a una reserva
            confirmada de este espacio.
          </DemoNotice>
        )}
      </div>
    </form>
  );
}

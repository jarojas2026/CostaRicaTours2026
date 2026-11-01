/**
 * Dueño del estado visible del panel de consulta (customer-intake) en App.
 *
 * App no se remonta al cambiar de identidad, así que una respuesta vieja que
 * llega tarde podría limpiar o pisar el panel de una consulta más nueva
 * (hallazgo P2 de Codex en #453). Cada consulta toma un turno con begin(); solo
 * el turno vigente puede tocar el estado visible (respuesta, id, enlace, carga).
 * Una respuesta descartada por cambio de identidad igual se informa a quien la
 * pidió (onResult), pero no borra la consulta nueva.
 */
export interface IntakeOwnership {
  /** Inicia una consulta y devuelve su turno; invalida los anteriores. */
  begin(): number;
  /** ¿Este turno sigue siendo el dueño del panel visible? */
  owns(token: number): boolean;
}

export function createIntakeOwnership(): IntakeOwnership {
  let current = 0;
  return {
    begin() { current += 1; return current; },
    owns(token: number) { return token === current; },
  };
}

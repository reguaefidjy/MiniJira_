export function LoginPage() {
  function handleLogin() {
    window.location.href = '/api/auth/login'
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="text-center">
        <h1 className="text-[2.75rem] font-semibold tracking-[-0.02em] text-[#0c0e10]">
          Mini Jira
        </h1>
        <p className="mt-2 text-[0.875rem] leading-[1.6] text-[#acb3b8]">
          Gestión de tareas del equipo
        </p>
      </div>

      <div className="w-80 rounded-xl bg-white p-8" style={{ boxShadow: '0px 12px 32px rgba(12,14,16,0.04)' }}>
        <button
          onClick={handleLogin}
          className="w-full rounded-md py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{
            background: 'linear-gradient(145deg, #005bbf, #0050a8)',
          }}
        >
          Iniciar sesión con cuenta corporativa
        </button>
        <p className="mt-4 text-center text-xs text-[#acb3b8]">
          Solo cuentas aprovisionadas por un administrador
        </p>
      </div>
    </div>
  )
}

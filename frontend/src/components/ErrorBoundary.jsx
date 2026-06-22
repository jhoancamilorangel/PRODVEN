import { Component } from 'react';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hayError: false, mensaje: '' };
    }

    static getDerivedStateFromError(error) {
        return { hayError: true, mensaje: error?.message || 'Error inesperado' };
    }

    componentDidCatch(error, info) {
        console.error('Error capturado por ErrorBoundary:', error, info);
    }

    reiniciar = () => {
        this.setState({ hayError: false, mensaje: '' });
    };

    render() {
        if (this.state.hayError) {
            return (
                <div style={{
                    minHeight: '100vh', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: '16px',
                    padding: '40px', textAlign: 'center', background: '#f7f9fc'
                }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: 18, background: 'rgba(231,76,60,0.12)',
                        color: '#e74c3c', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 32, fontWeight: 700
                    }}>!</div>
                    <h2 style={{ color: '#163b73', fontSize: 22 }}>Algo salió mal</h2>
                    <p style={{ color: '#5a6570', maxWidth: 420 }}>
                        Ocurrió un error inesperado en la pantalla. Puedes reintentar o volver atrás.
                    </p>
                    <button
                        onClick={this.reiniciar}
                        style={{
                            background: '#163b73', color: '#fff', padding: '12px 24px',
                            borderRadius: 12, fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer'
                        }}
                    >
                        Reintentar
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
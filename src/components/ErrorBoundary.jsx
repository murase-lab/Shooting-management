import { Component } from 'react';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('アプリでエラーが発生:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    handleClearStorage = () => {
        if (window.confirm('すべてのデータをリセットしますか？この操作は元に戻せません。')) {
            localStorage.removeItem('shooting-master-projects');
            localStorage.removeItem('shooting-master-models');
            window.location.reload();
        }
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-6">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full text-center shadow-lg">
                        <span className="material-symbols-outlined text-6xl text-red-500 mb-4">error</span>
                        <h1 className="text-xl font-bold mb-2">エラーが発生しました</h1>
                        <p className="text-gray-500 text-sm mb-6">
                            アプリの動作中にエラーが発生しました。
                            保存データが破損している可能性があります。
                        </p>
                        <div className="space-y-3">
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full py-3 bg-primary text-white rounded-xl font-medium"
                            >
                                リロードする
                            </button>
                            <button
                                onClick={this.handleClearStorage}
                                className="w-full py-3 border border-red-500 text-red-500 rounded-xl font-medium"
                            >
                                データをリセット
                            </button>
                        </div>
                        {this.state.error && (
                            <details className="mt-4 text-left">
                                <summary className="text-xs text-gray-400 cursor-pointer">エラー詳細</summary>
                                <pre className="mt-2 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded overflow-auto">
                                    {this.state.error.toString()}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

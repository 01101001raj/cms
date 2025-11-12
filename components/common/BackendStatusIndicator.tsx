import React from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { Link2 } from 'lucide-react';

const BackendStatusIndicator: React.FC = () => {
    const isConnected = !!supabase;

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg text-xs font-medium ${isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                {isConnected ? (
                    'Database Connected'
                ) : (
                    <>
                        <span>Database not connected.</span>
                        <Link to="/" className="underline hover:text-red-900 flex items-center gap-1">
                            Connect <Link2 size={12} />
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
};

export default BackendStatusIndicator;
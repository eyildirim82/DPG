import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import DynamicForm from '../components/DynamicForm';
import CountdownTimer, { OPEN_DATE } from '../components/CountdownTimer';

export default function DynamicFormPage() {
    const { id } = useParams();
    const [isOpen, setIsOpen] = useState(() => new Date() >= OPEN_DATE);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8">
                <Link to="/" className="text-blue-600 hover:text-blue-500 font-medium opacity-80 transition hover:opacity-100 flex justify-center items-center">
                    &larr; Back to Home
                </Link>
            </div>
            {isOpen ? (
                <DynamicForm formId={id} />
            ) : (
                <CountdownTimer onComplete={() => setIsOpen(true)} />
            )}
        </div>
    );
}

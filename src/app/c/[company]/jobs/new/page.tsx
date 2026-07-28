import CreateJobForm from '@/components/dashboard/company/CreateJobForm';

export default function NewJobPage() {
    return (
        <div className="p-6 max-w-5xl mx-auto">
            <header className="mb-8 text-center">
                <h1 className="text-3xl font-bold text-gray-900">Post a New Job</h1>
                <p className="text-gray-500 mt-2">Find the best talent for your team.</p>
            </header>
            <CreateJobForm />
        </div>
    );
}

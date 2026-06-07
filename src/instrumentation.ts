export async function register() {
    if (process.env.NEXT_RUNTIME !== 'nodejs') {
        return;
    }

    const { startServerStartupTasks } = await import('@/lib/startup-tasks');

    startServerStartupTasks();
}

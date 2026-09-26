<?php

namespace Database\Seeders;

use App\Models\Todo;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Data for the /scopes demo: enough users to paginate, a few todos.
 * Idempotent — run with: php artisan db:seed --class=ScopeDemoSeeder
 */
class ScopeDemoSeeder extends Seeder
{
    public function run(): void
    {
        if (User::count() < 40) {
            User::factory(60)->create();
        }

        if (Todo::count() === 0) {
            Todo::create(['name' => 'Read the Router Scopes RFC']);
            Todo::create(['name' => 'Try the user picker', 'done' => true]);
        }
    }
}

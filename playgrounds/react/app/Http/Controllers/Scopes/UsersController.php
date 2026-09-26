<?php

namespace App\Http\Controllers\Scopes;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Searchable, paginated user picker + user detail. Ordinary Inertia
 * controller — nothing scope-specific.
 */
class UsersController
{
    public function index(Request $request): Response
    {
        return Inertia::render('Scopes/Users', [
            'filters' => $request->only('search'),
            'users' => User::query()
                ->when($request->search, fn ($query, $search) => $query->where('name', 'like', "%{$search}%"))
                ->orderBy('name')
                ->paginate(15, ['id', 'name', 'email'])
                ->withQueryString(),
        ]);
    }

    public function show(User $user): Response
    {
        return Inertia::render('Scopes/UserDetail', [
            'user' => $user->only('id', 'name', 'email'),
        ]);
    }

    public function select(User $user): RedirectResponse
    {
        Inertia::flash('success', "Selected {$user->name}");

        // Redirect back to the picker path: inside a nested scope this
        // resolves to target "parent" (T7).
        return redirect('/scopes/users');
    }
}

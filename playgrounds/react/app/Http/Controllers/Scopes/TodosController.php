<?php

namespace App\Http\Controllers\Scopes;

use App\Models\Todo;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Demo index + todo form. Ordinary Inertia controller — nothing scope-specific.
 */
class TodosController
{
    public function index(): Response
    {
        return Inertia::render('Scopes/Index', [
            'todos' => Todo::latest()->take(10)->get(['id', 'name', 'done']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Scopes/TodoCreate');
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate(['name' => 'required|min:3']);

        Todo::create($request->only('name'));

        // Inertia::flash (not ->with()): only Inertia's own flash lands in
        // page.flash, which is what usePage().flash reads (QA finding).
        Inertia::flash('success', 'Todo created');

        // Success → the page behind the modal → target "root" (T4/T6).
        return redirect('/scopes');
    }
}

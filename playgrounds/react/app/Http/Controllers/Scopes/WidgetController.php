<?php

namespace App\Http\Controllers\Scopes;

use App\Models\Todo;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Widget with a deferred prop (D rules) and a pollable time prop.
 * Ordinary Inertia controller — nothing scope-specific.
 */
class WidgetController
{
    public function show(): Response
    {
        return Inertia::render('Scopes/Widget', [
            'time' => now()->format('H:i:s'),
            'stats' => Inertia::defer(function () {
                usleep(300_000); // visible fallback

                return [
                    'users' => User::count(),
                    'todos' => Todo::count(),
                    'open' => Todo::where('done', false)->count(),
                ];
            }),
        ]);
    }
}

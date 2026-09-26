<?php

namespace Tests\Feature\InertiaScope;

use App\Support\InertiaScope\ScopeHeaders;
use Illuminate\Support\Facades\Route;
use InvalidArgumentException;
use Tests\TestCase;

/**
 * Rules S4 (withScopeTarget flashes, invalid throws) and S5 (toScopeParent).
 */
class RedirectMacrosTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Route::middleware('web')->group(function () {
            Route::post('/macro-test/stay', fn () => redirect('/somewhere')->withScopeTarget('self'));
            Route::post('/macro-test/invalid', fn () => redirect('/somewhere')->withScopeTarget('bogus'));
            Route::post('/macro-test/parent', fn () => redirect()->toScopeParent());
        });
    }

    protected function scopedHeaders(): array
    {
        return [
            ScopeHeaders::SCOPE => 'test-modal',
            ScopeHeaders::SCOPE_URL => 'http://localhost/scopes/users',
            ScopeHeaders::PARENT_URL => 'http://localhost/dashboard?tab=open',
        ];
    }

    public function test_s4_valid_target_flashes_for_the_next_scoped_response(): void
    {
        $response = $this->withHeaders($this->scopedHeaders())->post('/macro-test/stay');

        $response->assertRedirect('http://localhost/somewhere');
        $this->assertSame('self', session(ScopeHeaders::SESSION_KEY));
    }

    public function test_s4_invalid_target_throws(): void
    {
        $this->withoutExceptionHandling();
        $this->expectException(InvalidArgumentException::class);

        $this->withHeaders($this->scopedHeaders())->post('/macro-test/invalid');
    }

    public function test_s5_to_scope_parent_redirects_to_the_parent_url(): void
    {
        $response = $this->withHeaders($this->scopedHeaders())->post('/macro-test/parent');

        $response->assertRedirect('http://localhost/dashboard?tab=open');
    }

    public function test_s5_without_parent_header_falls_back_to_back(): void
    {
        $response = $this
            ->withHeaders(['referer' => 'http://localhost/came-from'])
            ->post('/macro-test/parent');

        $response->assertRedirect('http://localhost/came-from');
    }
}

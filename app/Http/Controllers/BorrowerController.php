<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use App\Models\Borrower;
use App\Models\Outlet;
use Illuminate\Http\Request;

class BorrowerController extends Controller
{
    public function index(Request $request)
    {
        $q = trim((string) $request->get('search', ''));
        $status = $request->get('status', 'all');

        $borrowers = Borrower::query()
            ->when($q, function ($query) use ($q) {
                $query->where(function ($qq) use ($q) {
                    $qq->where('name', 'like', "%{$q}%")
                        ->orWhere('phone', 'like', "%{$q}%")
                        ->orWhere('email', 'like', "%{$q}%");
                });
            })
            ->when($status !== 'all', fn($q) => $q->where('is_active', $status === 'active'))
            ->latest()
            ->paginate(10)
            ->withQueryString()
            ->through(fn($b) => [
                'id' => $b->id,
                'outlet_id' => $b->outlet_id,
                'name' => $b->name,
                'phone' => $b->phone,
                'email' => $b->email,
                'address' => $b->address,
                'is_active' => (bool) $b->is_active,
            ]);

        return Inertia::render('Borrowers/Index', [
            'filters' => [
                'search' => $q,
                'status' => $status,
            ],
            'borrowers' => $borrowers,
            'outlets' => Outlet::select('id', 'name', 'code')->latest()->get(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'outlet_id' => 'nullable|exists:outlets,id',
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:30',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string|max:1000',
            'is_active' => 'required|boolean',
        ]);

        Borrower::create($data);

        return back()->with('success', 'Borrower created successfully.');
    }

    public function show(Borrower $borrower)
    {
        return response()->json($borrower);
    }

    public function update(Request $request, Borrower $borrower)
    {
        $data = $request->validate([
            'outlet_id' => 'nullable|exists:outlets,id',
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:30',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string|max:1000',
            'is_active' => 'required|boolean',
        ]);

        $borrower->update($data);

        return back()->with('success', 'Borrower updated successfully.');
    }

    public function destroy(Borrower $borrower)
    {
        if ($borrower->loans()->exists()) {
            return back()->with('error', 'Borrower has loans, cannot delete.');
        }

        $borrower->delete();

        return back()->with('success', 'Borrower deleted successfully.');
    }
}
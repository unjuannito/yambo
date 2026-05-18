import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProductEditor from './ProductEditor';
import { productService } from '~/services/productService';
import { familyProductService } from '~/services/familyProductService';
import toast from 'react-hot-toast';

const navigateMock = vi.fn();

vi.mock('react-router', () => ({
    useNavigate: () => navigateMock,
}));

vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock('~/services/productService', () => ({
    productService: {
        getAllProducts: vi.fn(),
        getProductById: vi.fn(),
        createProduct: vi.fn(),
        updateProduct: vi.fn(),
    },
}));

vi.mock('~/services/familyProductService', () => ({
    familyProductService: {
        listFamilyProducts: vi.fn(),
    },
}));

vi.mock('@fortawesome/react-fontawesome', () => ({
    FontAwesomeIcon: () => null,
}));

vi.mock('@dnd-kit/core', () => ({
    DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    closestCenter: vi.fn(),
    PointerSensor: vi.fn(),
    useSensor: vi.fn(() => ({})),
    useSensors: vi.fn(() => []),
}));

vi.mock('@dnd-kit/sortable', () => ({
    SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useSortable: vi.fn(() => ({
        attributes: {},
        listeners: {},
        setNodeRef: vi.fn(),
        transform: null,
        transition: '',
        isDragging: false,
    })),
    rectSortingStrategy: vi.fn(),
    verticalListSortingStrategy: vi.fn(),
    arrayMove: (arr: any[], from: number, to: number) => {
        const next = [...arr];
        const [item] = next.splice(from, 1);
        next.splice(to, 0, item);
        return next;
    },
}));

vi.mock('@dnd-kit/utilities', () => ({
    CSS: { Transform: { toString: () => '' } },
}));

vi.mock('~/components/common/FileUploader', () => ({
    default: () => <div>file-uploader</div>,
}));

vi.mock('~/components/common/forms/InputComponent', () => ({
    default: ({ label, value, onChange }: { label: string; value?: string | number; onChange?: (e: any) => void }) => (
        <label>
            {label}
            <input value={value as any} onChange={(e) => onChange?.(e)} />
        </label>
    ),
}));

vi.mock('~/components/common/forms/SelectComponent', () => ({
    default: ({ label, value, onChange, options }: { label: string; value?: string; onChange?: (e: any) => void; options?: { value: string; label: string }[] }) => (
        <label>
            {label}
            <select value={value} onChange={(e) => onChange?.(e)}>
                {(options || []).map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </label>
    ),
}));

vi.mock('~/components/common/forms/CheckboxComponent', () => ({
    default: ({ label }: { label: string }) => <label>{label}<input type="checkbox" /></label>,
}));

vi.mock('~/components/common/forms/MarkdownEditor', () => ({
    default: ({ value }: { value: string }) => <textarea value={value} readOnly />,
}));

vi.mock('~/components/common/forms/ButtonComponent', () => ({
    default: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
        <button onClick={onClick}>{children}</button>
    ),
}));

describe('ProductEditor', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(familyProductService.listFamilyProducts).mockResolvedValue({ content: [] } as any);
        vi.mocked(productService.getAllProducts).mockResolvedValue({ content: [] } as any);
    });

    it('renders create mode after loading products', async () => {
        render(<ProductEditor mode="create" />);

        await waitFor(() => {
            expect(screen.getByText('Crear Nuevo Producto')).toBeInTheDocument();
        });

        expect(productService.getAllProducts).toHaveBeenCalledWith(0, 100);
        expect(familyProductService.listFamilyProducts).toHaveBeenCalledWith(0, 200);
    });

    it('handles edit mode without productId by showing error and navigating back', async () => {
        render(<ProductEditor mode="edit" />);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalled();
        });

        expect(navigateMock).toHaveBeenCalledWith('/mi-espacio/merch');
        expect(productService.getProductById).not.toHaveBeenCalled();
    });
});

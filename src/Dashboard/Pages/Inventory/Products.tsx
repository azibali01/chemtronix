/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Chip,
  Group,
  Menu,
  Modal,
  NumberInput,
  Pagination,
  Select,
  SimpleGrid,
  Table,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconDots,
  IconEdit,
  IconPlus,
  IconSquareCheck,
  IconSquareX,
  IconTrash,
  IconBox,
  IconAlertTriangle,
  IconTrendingUp,
  IconCategory2,
  IconDownload,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { useMemo, useEffect, useState } from "react";
import { notifications } from "@mantine/notifications";
import {
  ProductsProvider,
  type Product,
} from "../../Context/Inventory/ProductsContext";
import { useProducts } from "../../Context/Inventory/ProductsContext";
import api from "../../../api_configuration/api";
import { useDebounce } from "../../../hooks/useDebounce";
const money = (n: number) =>
  `${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function stockStatus(p: { quantity: number; minimumStockLevel: number }) {
  if (p.quantity <= p.minimumStockLevel)
    return { label: "Low", color: "red" as const };
  if (p.quantity <= p.minimumStockLevel * 2)
    return { label: "Medium", color: "yellow" as const };
  return { label: "Good", color: "green" as const };
}

function getNextProductCode(products: Array<{ code: string }>) {
  if (!products.length) return "1";
  const numbers = products
    .map((p) => {
      const match = p.code.match(/(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => !isNaN(n));
  const next = Math.max(...numbers, 0) + 1;
  return next.toString();
}

function ProductsInner() {
  const {
    products,
    setProducts,
    categories,
    setCategories,
    query,
    cat,
    setCat,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    opened,
    setOpened,
    editing,
    setEditing,
    delId,
    setDelId,
    catModal,
    setCatModal,
    productName,
    setProductName,
    code,
    setCode,
    category,
    setCategory,
    productDescription,
    setProductDescription,
    unitPrice,
    setUnitPrice,
    costPrice,
    setCostPrice,
    quantity,
    setQuantity,
    minimumStockLevel,
    setMinimumStockLevel,
    status,
    setStatus,
    newCategory,
    setNewCategory,
    loading,
    setLoading,
    search,
  } = useProducts();

  // Local state for uncontrolled search input
  const [searchInput, setSearchInput] = useState("");

  // Debounce the search input
  const debouncedSearchTerm = useDebounce(searchInput, 300);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get("/products");

      if (response.data && Array.isArray(response.data)) {
        const transformedProducts: Product[] = response.data.map(
          (product: any) => ({
            id:
              product.id ||
              product._id ||
              `p-${Math.random().toString(36).slice(2, 8)}`,
            code: String(product.code || ""),
            productName: String(
              product.name || product.productname || product.productName || "",
            ),
            category: String(product.category || ""),
            productDescription: String(
              product.description || product.productDescription || "",
            ),
            quantity: product.stock || product.quantity || 0,
            minimumStockLevel:
              product.minStock ||
              product.min_stock ||
              product.minimumStockLevel ||
              0,
            unitPrice: product.unitPrice || product.unit_price || 0,
            costPrice: product.costPrice || product.cost_price || 0,
            openingQuantity: Number(
              product.openingQuantity ?? product.quantity ?? 0,
            ),
            status:
              product.status === "active" || product.status === "inactive"
                ? product.status
                : "active",
          }),
        );

        setProducts(transformedProducts);

        const uniqueCategories = Array.from(
          new Set(transformedProducts.map((p) => p.category).filter(Boolean)),
        );
        if (uniqueCategories.length > 0) {
          setCategories((prev) => {
            const merged = [...new Set([...prev, ...uniqueCategories])];
            return merged;
          });
        }

        notifications.show({
          title: "Success",
          message: `Loaded ${transformedProducts.length} products`,
          color: "green",
        });
      }
    } catch (error: any) {
      console.error("Error fetching products:", error);
      notifications.show({
        title: "Error",
        message: error.response?.data?.message || "Failed to load products",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  const pageSize = 5;

  const totalProducts = products.length;
  const activeCount = products.filter((r) => r.status === "active").length;
  const lowStockCount = products.filter(
    (r) => r.quantity <= r.minimumStockLevel,
  ).length;
  const stockValue = products.reduce(
    (sum, r) => sum + Number(r.quantity) * Number(r.unitPrice),
    0,
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((r) => {
      // Enhanced search: match product name, code, or category with null safety
      const matchQ =
        !q ||
        (r.productName &&
          typeof r.productName === "string" &&
          r.productName.toLowerCase().includes(q)) ||
        (r.code &&
          typeof r.code === "string" &&
          r.code.toLowerCase().includes(q)) ||
        (r.category &&
          typeof r.category === "string" &&
          r.category.toLowerCase().includes(q)) ||
        (r.productDescription &&
          typeof r.productDescription === "string" &&
          r.productDescription.toLowerCase().includes(q));
      const matchC = cat ? r.category === cat : true;
      const matchS = statusFilter === "all" ? true : r.status === statusFilter;
      return matchQ && matchC && matchS;
    });
  }, [products, query, cat, statusFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const pageData = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleDelete = (id: string) => {
    setDelId(id);
  };

  const openCreate = () => {
    setEditing(null);
    resetForm();
    setCode(getNextProductCode(products));
    setOpened(true);
  };

  // Fix: Always pass a string for description (never undefined)
  const openEdit = (p: {
    id: string;
    productName: string;
    code: string;
    category: string;
    productDescription?: string;
    unitPrice: number;
    costPrice: number;
    quantity: number;
    minimumStockLevel: number;
    openingQuantity?: number;
    status: string;
  }) => {
    setEditing({
      ...p,
      productDescription: p.productDescription ?? "",
      status: p.status === "active" ? "active" : "inactive",
      openingQuantity: p.openingQuantity ?? 0,
    } as any);
    setProductName(p.productName);
    setCode(p.code);
    setCategory(p.category);
    setProductDescription(p.productDescription ?? "");
    setUnitPrice(p.unitPrice);
    setCostPrice(p.costPrice);
    setQuantity(p.quantity);
    setMinimumStockLevel(p.minimumStockLevel);
    setStatus(p.status === "active" ? "active" : "inactive");
    setOpened(true);
  };

  const handleSubmit = async () => {
    if (
      !productName ||
      !code ||
      !category ||
      unitPrice === "" ||
      costPrice === "" ||
      quantity === "" ||
      minimumStockLevel === ""
    ) {
      notifications.show({
        title: "Validation Error",
        message: "Please fill in all required fields",
        color: "red",
      });
      return;
    }

    const statusValue: "active" | "inactive" =
      status === "active" ? "active" : "inactive";

    const basePayload = {
      //change name to productname
      productName: productName,
      code,
      category,
      productDescription: productDescription ?? "",
      unitPrice: Number(unitPrice),
      costPrice: Number(costPrice),
      quantity: Number(quantity),
      minimumStockLevel: Number(minimumStockLevel),
    };

    const updatePayload = {
      ...basePayload,
      status: statusValue,
    };

    try {
      if (editing) {
        const response = await api.put(
          `/products/update-product-by-id/${editing.id}`,
          updatePayload,
        );
        const updatedProduct: Product = {
          id: editing.id,
          ...(response.data ?? updatePayload),
        };
        setProducts((prev) =>
          prev.map((r) => (r.id === editing.id ? updatedProduct : r)),
        );
        notifications.show({
          title: "Success",
          message: "Product updated successfully",
          color: "green",
        });
      } else {
        const response = await api.post(
          "/products/create-product",
          basePayload,
        );
        console.log("Create product response:", response);
        if (response.data) {
          notifications.show({
            title: "Success",
            message: "Product created successfully",
            color: "green",
          });
        }
      }

      setOpened(false);
      resetForm();
      await fetchProducts();
    } catch (error: any) {
      notifications.show({
        title: "Error",
        message: error.response?.data?.message || "Failed to save product",
        color: "red",
      });
      console.error("Error saving product:", error);
    }
  };

  const toggleStatus = (id: string) => {
    setProducts((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: r.status === "active" ? "inactive" : "active" }
          : r,
      ),
    );
  };

  const confirmDelete = async () => {
    if (!delId) return;
    try {
      await api.delete(`/products/delete-product-by-id/${delId}`);
      setProducts((prev) => prev.filter((r) => r.id !== delId));
      notifications.show({
        title: "Deleted",
        message: "Product deleted successfully",
        color: "green",
      });
    } catch (error: any) {
      notifications.show({
        title: "Error",
        message: error.response?.data?.message || "Failed to delete product",
        color: "red",
      });
    } finally {
      setDelId(null);
    }
  };

  const resetForm = () => {
    setProductName("");
    setCode("");
    setCategory(null);
    setProductDescription("");
    setUnitPrice("");
    setCostPrice("");
    setQuantity("");
    setMinimumStockLevel("");
    setStatus("active");
  };

  const exportPDF = (p: Product) => {
    const content = `${p.productName} (${p.code})
Category: ${p.category}
Stock: ${p.quantity} | Min: ${p.minimumStockLevel}
Unit Price: ${money(p.unitPrice === "" ? 0 : p.unitPrice)}
Cost Price: ${money(p.costPrice === "" ? 0 : p.costPrice)}
Status: ${p.status}`;
    const blob = new Blob([content], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${p.productName}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Load products on component mount
  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (lowStockCount > 0) {
      notifications.show({
        title: "Low Stock Alert",
        message: `${lowStockCount} product(s) are low in stock!`,
        color: "red",
        icon: <IconAlertTriangle />,
        autoClose: 5000,
      });
    }
  }, [lowStockCount]);

  // Handle debounced search
  useEffect(() => {
    if (debouncedSearchTerm.trim()) {
      search(debouncedSearchTerm);
    } else {
      // Reset to show all products when search is cleared
      fetchProducts();
    }
  }, [debouncedSearchTerm]);

  return (
    <div>
      <Group justify="space-between" mb="md">
        <Title order={2}>Product Management</Title>
        <Button
          leftSection={<IconPlus size={16} />}
          color="#0A6802"
          onClick={openCreate}
        >
          Add Product
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 4 }} spacing="lg" mb="lg">
        <Card withBorder bg={"#F1FCF0"}>
          <Group justify="space-between">
            <Text>Total Products</Text>
            <ThemeIcon variant="light" color="#0A6802">
              <IconBox size={20} />
            </ThemeIcon>
          </Group>
          <Title order={2}>{totalProducts}</Title>
          <Text size="sm" c="dimmed">
            {activeCount} active
          </Text>
        </Card>

        <Card withBorder bg={"#F1FCF0"}>
          <Group justify="space-between">
            <Text>Low Stock Items</Text>
            <ThemeIcon variant="light" color="yellow">
              <IconAlertTriangle size={20} />
            </ThemeIcon>
          </Group>
          <Title order={2}>{lowStockCount}</Title>
          <Text size="sm" c="dimmed">
            Need attention
          </Text>
        </Card>

        <Card withBorder bg={"#F1FCF0"}>
          <Group justify="space-between">
            <Text>Stock Value</Text>
            <ThemeIcon variant="light" color="teal">
              <IconTrendingUp size={20} />
            </ThemeIcon>
          </Group>
          <Title order={2}>{money(stockValue)}</Title>
          <Text size="sm" c="dimmed">
            Total inventory value
          </Text>
        </Card>

        <Card withBorder bg={"#F1FCF0"}>
          <Group justify="space-between">
            <Text>Categories</Text>
            <ThemeIcon variant="light" color="grape">
              <IconCategory2 size={20} />
            </ThemeIcon>
          </Group>
          <Title order={2}>{categories.length}</Title>
          <Button
            size="xs"
            mt="xs"
            variant="light"
            color="grape"
            onClick={() => setCatModal(true)}
          >
            Manage Categories
          </Button>
        </Card>
      </SimpleGrid>

      <Card withBorder radius="md" p="md" style={{ background: "#F1FCF0" }}>
        <Group justify="space-between" mb="sm">
          <div>
            <Text fw={600}>Products List</Text>
            <Text c={"dimmed"} size="sm">
              Manage your product inventory and stock levels
              {searchInput &&
                ` • Found ${filtered.length} product(s) matching "${searchInput}"`}
            </Text>
          </div>
        </Group>
        <Group mb="md" grow>
          <TextInput
            placeholder="Search by product name, code, category, or description..."
            value={searchInput}
            leftSection={<IconSearch size={16} />}
            rightSection={
              loading ? (
                <Text size="xs" c="dimmed">
                  Searching...
                </Text>
              ) : (
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  onClick={() => {
                    setSearchInput("");
                    setPage(1);
                  }}
                  style={{
                    opacity: searchInput ? 1 : 0,
                    pointerEvents: searchInput ? "auto" : "none",
                  }}
                >
                  <IconX size={16} />
                </ActionIcon>
              )
            }
            onChange={(e) => {
              setSearchInput(e.currentTarget.value);
              setPage(1); // Reset to first page when searching
            }}
          />
          <Select
            placeholder="All Categories"
            data={categories}
            clearable
            value={cat}
            onChange={(value) => {
              setCat(value);
              setPage(1); // Reset to first page when filtering by category
            }}
          />
        </Group>

        <Group mb="md">
          <Chip.Group
            value={statusFilter}
            onChange={(value) => {
              if (typeof value === "string") {
                setStatusFilter(value as "all" | "active" | "inactive");
              }
            }}
          >
            <Chip value="all" color="#819E00">
              All
            </Chip>
            <Chip value="active" color="#0A6802">
              Active
            </Chip>
            <Chip value="inactive" color="gray">
              Inactive
            </Chip>
          </Chip.Group>
        </Group>

        {/* ---- Table ---- */}
        {loading ? (
          <Card withBorder p="xl" style={{ textAlign: "center" }}>
            <Title order={4} c="dimmed">
              Loading products...
            </Title>
            <Text size="sm" c="dimmed" mt="xs">
              Please wait while we fetch your products
            </Text>
          </Card>
        ) : (
          <Table highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Product Code</Table.Th>
                <Table.Th>Product Name</Table.Th>
                <Table.Th>Category</Table.Th>
                <Table.Th>Opening Stock</Table.Th>
                <Table.Th>Current Stock</Table.Th>
                <Table.Th>Unit Price</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Stock Status</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {pageData.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={9}>
                    <Text c="dimmed" ta="center" py="xl">
                      {searchInput && products.length === 0
                        ? "No products found matching your search. Try a different term."
                        : "No products available. Click 'Add Product' to create one."}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                pageData.map((p) => {
                  // Ensure quantity and minimumStockLevel are numbers for stockStatus
                  const ss = stockStatus({
                    quantity: typeof p.quantity === "number" ? p.quantity : 0,
                    minimumStockLevel:
                      typeof p.minimumStockLevel === "number"
                        ? p.minimumStockLevel
                        : 0,
                  });
                  return (
                    <Table.Tr key={p.id}>
                      <Table.Td>
                        <Text fw={600} c="#819E00">
                          {p.code}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text fw={500}>{p.productName}</Text>
                        <Text size="xs" c="dimmed">
                          {p.productDescription}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light" color="grape">
                          {p.category}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text c="dimmed">{p.openingQuantity ?? 0}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text>{p.quantity}</Text>
                        <Text size="xs" c="dimmed">
                          Min: {p.minimumStockLevel}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        {money(p.unitPrice === "" ? 0 : p.unitPrice)}
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={p.status === "active" ? "#0A6802" : "gray"}
                          variant="filled"
                        >
                          {p.status}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={6}>
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 999,
                              background:
                                ss.color === "green"
                                  ? "#22c55e"
                                  : ss.color === "yellow"
                                    ? "#f59e0b"
                                    : "#ef4444",
                              display: "inline-block",
                            }}
                          />
                          <Text size="sm">{ss.label}</Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Menu withinPortal shadow="sm" position="bottom-end">
                          <Menu.Target>
                            <ActionIcon variant="light" color="#0A6802">
                              <IconDots size={16} />
                            </ActionIcon>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Item
                              leftSection={<IconEdit size={16} />}
                              onClick={() =>
                                openEdit({
                                  ...p,
                                  unitPrice:
                                    typeof p.unitPrice === "number"
                                      ? p.unitPrice
                                      : 0,
                                  costPrice:
                                    typeof p.costPrice === "number"
                                      ? p.costPrice
                                      : 0,
                                  quantity:
                                    typeof p.quantity === "number"
                                      ? p.quantity
                                      : 0,
                                  minimumStockLevel:
                                    typeof p.minimumStockLevel === "number"
                                      ? p.minimumStockLevel
                                      : 0,
                                })
                              }
                            >
                              Edit
                            </Menu.Item>
                            <Menu.Item
                              leftSection={
                                p.status === "active" ? (
                                  <IconSquareX size={16} />
                                ) : (
                                  <IconSquareCheck size={16} />
                                )
                              }
                              onClick={() => toggleStatus(p.id)}
                            >
                              {p.status === "active"
                                ? "Mark Inactive"
                                : "Mark Active"}
                            </Menu.Item>
                            <Menu.Item
                              leftSection={<IconDownload size={16} />}
                              onClick={() => exportPDF(p)}
                            >
                              Download PDF
                            </Menu.Item>
                            <Menu.Divider />
                            <Menu.Item
                              color="red"
                              leftSection={<IconTrash size={16} />}
                              onClick={() => handleDelete(p.id)}
                            >
                              Delete
                            </Menu.Item>
                          </Menu.Dropdown>
                        </Menu>
                      </Table.Td>
                    </Table.Tr>
                  );
                })
              )}
            </Table.Tbody>
          </Table>
        )}

        {/* ---- Pagination ---- */}
        {totalPages > 1 && (
          <Group justify="center" mt="md">
            <Pagination total={totalPages} value={page} onChange={setPage} />
          </Group>
        )}
      </Card>

      {/* Product Modal (create/edit) */}
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={
          editing ? (
            <strong>Edit Product</strong>
          ) : (
            <strong>Add New Product</strong>
          )
        }
        centered
        size="lg"
      >
        <SimpleGrid cols={2} mb="md">
          <TextInput
            label="Product Code"
            value={code}
            onChange={(e) => setCode(e.currentTarget.value)}
          />
          <TextInput
            label="Product Name"
            value={productName}
            onChange={(e) => setProductName(e.currentTarget.value)}
          />
        </SimpleGrid>
        <SimpleGrid cols={2} mb="md">
          <Select
            label="Category"
            data={categories}
            value={category}
            onChange={setCategory}
            searchable
          />
          <div />
        </SimpleGrid>
        <Textarea
          label="Description"
          value={productDescription}
          onChange={(e) => setProductDescription(e.currentTarget.value)}
          mb="md"
        />
        <SimpleGrid cols={2} mb="md">
          <NumberInput
            label="Unit Price"
            value={unitPrice}
            onChange={(v) => setUnitPrice(v === "" ? "" : Number(v))}
          />
          <NumberInput
            label="Cost Price"
            value={costPrice}
            onChange={(v) => setCostPrice(v === "" ? "" : Number(v))}
          />
        </SimpleGrid>
        <SimpleGrid cols={2} mb="md">
          {editing ? (
            <NumberInput
              label="Opening Stock (Fixed)"
              value={editing.openingQuantity ?? 0}
              disabled
            />
          ) : (
            <NumberInput
              label="Initial Stock Quantity"
              value={quantity}
              onChange={(v) => setQuantity(v === "" ? "" : Number(v))}
            />
          )}
          {editing ? (
            <NumberInput
              label="Current Stock"
              value={quantity}
              onChange={(v) => setQuantity(v === "" ? "" : Number(v))}
            />
          ) : (
            <NumberInput
              label="Min Stock Level"
              value={minimumStockLevel}
              onChange={(v) => setMinimumStockLevel(v === "" ? "" : Number(v))}
            />
          )}
        </SimpleGrid>
        {editing && (
          <SimpleGrid cols={2} mb="md">
            <NumberInput
              label="Min Stock Level"
              value={minimumStockLevel}
              onChange={(v) => setMinimumStockLevel(v === "" ? "" : Number(v))}
            />
            <div />
          </SimpleGrid>
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setOpened(false)}>
            Cancel
          </Button>
          <Button color="#0A6802" onClick={handleSubmit}>
            {editing ? "Update Product" : "Create Product"}
          </Button>
        </Group>
      </Modal>

      {/* Delete Confirm */}
      <Modal
        opened={!!delId}
        onClose={() => setDelId(null)}
        title="Delete Product"
        centered
      >
        <Text>Are you sure you want to delete this product?</Text>
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={() => setDelId(null)}>
            Cancel
          </Button>
          <Button color="red" onClick={confirmDelete}>
            Delete
          </Button>
        </Group>
      </Modal>

      {/* Category Manager */}
      <Modal
        opened={catModal}
        onClose={() => setCatModal(false)}
        title="Manage Categories"
        centered
      >
        {categories.map((c) => (
          <Group key={c} mb="xs" justify="space-between">
            <Text>{c}</Text>
            <ActionIcon
              color="red"
              variant="light"
              onClick={() =>
                setCategories((prev) => prev.filter((x) => x !== c))
              }
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        ))}
        <Group mt="sm">
          <TextInput
            placeholder="New category"
            value={newCategory}
            onChange={(e) => setNewCategory(e.currentTarget.value)}
          />
          <Button
            color="green"
            onClick={() => {
              if (newCategory.trim()) {
                setCategories((prev) => [...prev, newCategory.trim()]);
                setNewCategory("");
              }
            }}
          >
            Add
          </Button>
        </Group>
      </Modal>
    </div>
  );
}

export default function Products() {
  return (
    <ProductsProvider>
      <ProductsInner />
    </ProductsProvider>
  );
}

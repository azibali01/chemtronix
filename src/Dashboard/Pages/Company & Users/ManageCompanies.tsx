import {
  Box,
  Button,
  Card,
  Group,
  Table,
  Text,
  TextInput,
  Badge,
  ScrollArea,
  Modal,
  ActionIcon,
} from "@mantine/core";
import { useState } from "react";
import {
  IconSearch,
  IconBuildingSkyscraper,
  IconEdit,
  IconTrash,
} from "@tabler/icons-react";
import { useCompanyContext } from "../../Context/Company & Users/CompanyContext";

export default function ManageCompanies() {
  const { companies, addCompany, updateCompany, deleteCompany } =
    useCompanyContext();

  const [search, setSearch] = useState("");
  const [opened, setOpened] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    address: "",
    email: "",
    phone: "",
    users: 0,
    status: "active" as "active" | "inactive",
    created: new Date().toLocaleDateString(),
  });

  const filteredCompanies = companies.filter((c) =>
    [c.name, c.email, c.phone, c.address].some((field) =>
      field.toLowerCase().includes(search.toLowerCase())
    )
  );

  const handleSubmit = () => {
    if (editIndex !== null) {
      updateCompany(editIndex, form);
      setEditIndex(null);
    } else {
      addCompany(form);
    }
    setForm({
      name: "",
      address: "",
      email: "",
      phone: "",
      users: 0,
      status: "active",
      created: new Date().toLocaleDateString(),
    });
    setOpened(false);
  };

  const handleEdit = (index: number) => {
    setForm(companies[index]);
    setEditIndex(index);
    setOpened(true);
  };

  return (
    <Box p="md">
      <Group justify="space-between" mb="md">
        <Text fw={700} size="xl">
          Company Management
        </Text>
        <Button color="#0A6802" onClick={() => setOpened(true)}>
          + Add Company
        </Button>
      </Group>

      <Modal opened={opened} onClose={() => setOpened(false)} title="Company">
        <TextInput
          label="Company Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.currentTarget.value })}
          mb="sm"
        />
        <TextInput
          label="Address"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.currentTarget.value })}
          mb="sm"
        />
        <TextInput
          label="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.currentTarget.value })}
          mb="sm"
        />
        <TextInput
          label="Phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.currentTarget.value })}
          mb="sm"
        />
        <TextInput
          label="Users"
          type="number"
          value={form.users}
          onChange={(e) =>
            setForm({ ...form, users: parseInt(e.currentTarget.value) || 0 })
          }
          mb="sm"
        />
        <Button fullWidth mt="md" color="#0A6802" onClick={handleSubmit}>
          {editIndex !== null ? "Update Company" : "Add Company"}
        </Button>
      </Modal>

      <Card
        shadow="sm"
        radius="md"
        withBorder
        style={{ background: "#F5FFF5" }}
      >
        <Text fw={600} mb="xs">
          Companies
        </Text>
        <Text c="dimmed" size="sm" mb="md">
          Manage your company profiles and settings
        </Text>

        <TextInput
          placeholder="Search"
          size="sm"
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          leftSection={<IconSearch size={14} color="#819E00" />}
          styles={{
            input: {
              border: "1px solid #0A6802",
              color: "#000000ff",
              "::placeholder": { color: "#000000ff" },
            },
          }}
          mb="md"
        />

        <ScrollArea>
          <Table
            highlightOnHover
            withTableBorder
            withColumnBorders
            verticalSpacing="sm"
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Company</Table.Th>
                <Table.Th>Contact</Table.Th>
                <Table.Th>Users</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Created</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredCompanies.map((c, i) => (
                <Table.Tr key={i}>
                  <Table.Td>
                    <Group>
                      <Box
                        p={8}
                        style={{
                          background: "#E6F6E6",
                          borderRadius: 8,
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <IconBuildingSkyscraper color="#0A6802" size={20} />
                      </Box>
                      <Box>
                        <Text fw={500}>{c.name}</Text>
                        <Text size="xs" c="dimmed">
                          {c.address}
                        </Text>
                      </Box>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{c.email}</Text>
                    <Text size="xs" c="dimmed">
                      {c.phone}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge color="dark">{c.users} users</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      color={c.status === "active" ? "#819E00" : "gray"}
                      variant="filled"
                    >
                      {c.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{c.created}</Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <ActionIcon
                        variant="light"
                        color="#0A6802"
                        style={{ cursor: "pointer", color: "#0A6802" }}
                        onClick={() => handleEdit(i)}
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon
                        variant="light"
                        color="red"
                        style={{ cursor: "pointer" }}
                        onClick={() => deleteCompany(i)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Card>
    </Box>
  );
}

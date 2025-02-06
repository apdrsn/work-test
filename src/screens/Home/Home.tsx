import { DataGridPro, DataGridProProps } from '@mui/x-data-grid-pro';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

const fetchToken = async () => {
  const response = await fetch('http://localhost:3001/proxy/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: import.meta.env.VITE_DATA_CLIENT_ID,
      client_secret: import.meta.env.VITE_DATA_CLIENT_SECRET,
      scope: 'all-apis sql',
    }),
  });

  if (!response.ok) {
    throw new Error(`Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

const fetchWithToken = async (
  url: string,
  options: RequestInit,
  token?: string | null,
) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) throw new Error('Network response was not ok');
  return response.json();
};

interface StatementData {
  statement_id: string;
}

interface StatusDataItem {
  state: string;
}

interface StatusData {
  statement_id: string;
  status: StatusDataItem;
  result: {
    external_links: {
      external_link: string;
    }[];
  };
  manifest: {
    schema: {
      columns: SchemaColumn[];
    };
    total_chunk_count: number;
  };
}

interface SchemaColumn {
  name: string;
  // add other properties that might be in the schema columns
  type?: string;
  nullable?: boolean;
}

export const Home = () => {
  const [schemaColumns, setSchemaColumns] = useState<SchemaColumn[]>();
  const [rows, setRows] = useState<any[]>([]);
  const { data: tokenData } = useQuery({
    queryKey: ['tokenFetch'],
    queryFn: fetchToken,
  });
  const [token, setToken] = useState<string | null>(
    tokenData?.access_token || null,
  );
  const [chunkCurrent, setChunkCurrent] = useState(1);
  const [chunkCount, setChunkCount] = useState(0);
  const [nextChunkUrl, setNextChunkUrl] = useState<string | null>(null);

  useEffect(() => {
    setToken(tokenData?.access_token || null);
  }, [tokenData]);

  // Create a post request the data
  const { data: statementData, isLoading: statementIsLoading } =
    useQuery<StatementData>({
      queryKey: ['statement'],
      queryFn: () => {
        return fetchWithToken(
          'http://localhost:3001/proxy/statements',
          {
            method: 'POST',
            body: JSON.stringify({
              warehouse_id: 'ca5fa7b9f466e887',
              catalog: 'test_databricks_premium',
              schema: 'ingest_phoenix_test',
              format: 'JSON',
              disposition: 'EXTERNAL_LINKS',
              statement: 'SELECT * FROM workunits_raw_test LIMIT 1000000',
            }),
            headers: {
              'Content-Type': 'application/json',
            },
          },
          token,
        );
      },
      enabled: !!token,
    });

  // Get the status of the data
  // Update the status query success handler to store the next chunk URL
  const { data: statusData, isLoading: statusIsLoading } = useQuery<StatusData>(
    {
      queryKey: ['status', statementData?.statement_id],
      queryFn: () =>
        fetchWithToken(
          `http://localhost:3001/proxy/statements/${statementData?.statement_id}`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
          token,
        ),
      enabled: !!statementData?.statement_id,
      refetchInterval: (data) => {
        console.log(data);
        return data?.state?.data?.status?.state !== 'SUCCEEDED' ? 2000 : false;
      },
    },
  );

  // Get the actual data
  const url = statusData?.result?.external_links[0]?.external_link;
  // const nextLink
  const parametersOnly =
    url?.replace('https://dbstoragerfppaces3q7b6.blob.core.windows.net/', '') ||
    '';

  const { data: resultData, isLoading: resultIsLoading } = useQuery({
    queryKey: [
      'resultData',
      statusData?.result?.external_links[0]?.external_link,
    ],
    queryFn: () =>
      fetchWithToken(
        `http://localhost:3001/proxy/statements/result/${parametersOnly}`,
        {},
      ),
    enabled: statusData?.status?.state === 'SUCCEEDED',
    // onSuccess: () => {
    //   setIsLoading(false);
    //   setSchemaColumns(statusData.manifest?.schema?.columns || []);
    //   setChunkCount(statusData.manifest?.total_chunk_count || 0);
    // },
  });

  useEffect(() => {
    setSchemaColumns(statusData?.manifest?.schema?.columns || []);
    setChunkCount(statusData?.manifest?.total_chunk_count || 0);
    setNextChunkUrl(
      `http://localhost:3001/proxy/statements/${statusData?.statement_id}/result/chunks/1`,
    );
  }, [statusData]);

  const columns =
    schemaColumns?.map((column) => ({
      field: column.name,
      headerName: column.name,
      width: 150,
      sortable: false,
      filterable: false,
    })) || [];

  const fetchNextChunk = useQuery({
    queryKey: ['chunk', chunkCurrent],
    queryFn: async () => {
      if (!nextChunkUrl) return null;
      const chunkStatusData = await fetchWithToken(nextChunkUrl, {}, token);

      const chunkParametersOnly =
        chunkStatusData?.external_links[0]?.external_link?.replace(
          'https://dbstoragerfppaces3q7b6.blob.core.windows.net/',
          '',
        );

      const chunkData = await fetchWithToken(
        `http://localhost:3001/proxy/statements/result/${chunkParametersOnly}`,
        {},
        token,
      );

      // Update the next chunk URL for subsequent fetches
      setNextChunkUrl(
        chunkCurrent + 1 < chunkCount
          ? `http://localhost:3001/proxy/statements/${statementData?.statement_id}/result/chunks/${chunkCurrent + 1}`
          : null,
      );

      return chunkData;
    },
    enabled: false, // Only run when explicitly called
  });

  useEffect(() => {
    if (fetchNextChunk.data) {
      const tempRows = fetchNextChunk.data.map(
        (row: string[], index: number) => {
          const rowObject: { [key: string]: any } = {
            id: rows.length + index,
          };
          schemaColumns?.forEach((column, colIndex) => {
            rowObject[column.name] = row[colIndex];
          });
          return rowObject;
        },
      );
      setRows((prev) => [...prev, ...tempRows]);
    }
  }, [fetchNextChunk]);

  useEffect(() => {
    if (resultData) {
      const tempRows = resultData.map((row: string[], index: number) => {
        const rowObject: { [key: string]: any } = {
          id: index,
        };
        schemaColumns?.forEach((column, colIndex) => {
          rowObject[column.name] = row[colIndex];
        });
        return rowObject;
      });
      setRows(tempRows);
    }
  }, [resultData, schemaColumns]);

  // Update the scroll handler to fetch the next chunk
  const handleOnRowsScrollEnd = useCallback<
    NonNullable<DataGridProProps['onRowsScrollEnd']>
  >(async () => {
    console.log('scroll end');
    console.log(nextChunkUrl, chunkCurrent, chunkCount);
    if (!nextChunkUrl || chunkCurrent >= chunkCount) return;
    await fetchNextChunk.refetch();
    setChunkCurrent((prevChunk) => prevChunk + 1);
  }, [nextChunkUrl, chunkCurrent, chunkCount, fetchNextChunk]);

  console.log(statementData, statusData, resultData);
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: rows.length === 0 ? '350px' : 0,
        maxHeight: `calc(100vh - 130px)`,
      }}
    >
      <DataGridPro
        columns={columns}
        rows={rows}
        loading={
          statementIsLoading ||
          statusIsLoading ||
          resultIsLoading ||
          fetchNextChunk.isLoading
        }
        disableColumnFilter
        slotProps={{
          toolbar: {
            showQuickFilter: false,
            csvOptions: { disableToolbarButton: true },
            printOptions: { disableToolbarButton: true },
          },
        }}
        onRowsScrollEnd={chunkCount > 0 ? handleOnRowsScrollEnd : undefined}
      />
    </div>
  );
};

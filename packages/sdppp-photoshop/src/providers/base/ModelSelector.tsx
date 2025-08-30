import React, { useState, useEffect } from 'react';
import { Alert, Flex, Spin, Typography, Select } from 'antd';

export interface ModelOption {
    value: string;
    label: React.ReactNode | string;
    searchText?: string;
    displayText?: string;
}

interface ModelSelectorProps {
    // Basic props
    value?: string;
    placeholder?: string;
    loading?: boolean;
    loadError?: string;
    className?: string;
    
    // Options
    options: ModelOption[];
    
    // Callbacks
    onChange: (value: string) => Promise<void> | void;
    onInputChange?: (value: string) => void;
    
    // Optional advanced features
    notFoundContent?: React.ReactNode;
}

export function ModelSelector({
    value,
    placeholder,
    loading,
    loadError,
    className = "renderer-model-select",
    options,
    onChange,
    onInputChange,
    notFoundContent
}: ModelSelectorProps) {
    const [inputValue, setInputValue] = useState<string>(value || '');
    const [isHandling, setIsHandling] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (value) {
            // Try to find display text from options
            const option = options.find(opt => opt.value === value);
            setInputValue(option?.displayText || value);
        } else {
            setInputValue('');
        }
    }, [value, options]);

    const handleChange = async (newValue: string) => {
        if (newValue === value || isHandling) {
            return;
        }
        
        setIsHandling(true);
        try {
            await onChange(newValue);
        } finally {
            setIsHandling(false);
        }
    };

    const handleInputChange = (newValue: string) => {
        setInputValue(newValue);
        onInputChange?.(newValue);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(true);
        setInputValue('');
        // 使用 setTimeout 确保在下一个事件循环中执行，以覆盖默认的光标位置设置
        setTimeout(() => {
            if (e.target) {
                e.target.setSelectionRange(0, 0);
            }
        }, 0);
    };

    const handleBlur = () => {
        setIsFocused(false);
        if (inputValue && inputValue.trim()) {
            handleChange(inputValue);
        } else {
            // 如果没有输入值，恢复到之前的值，不触发变化事件
            setInputValue(value || '');
        }
    };

    const renderSelector = () => {
        return (
            <Select
                placeholder={placeholder}
                value={inputValue || undefined}
                onChange={(selectedValue, option) => {
                    const selectedOption = option as any;
                    if (selectedOption && selectedOption.displayText) {
                        setInputValue(selectedOption.displayText);
                    } else {
                        setInputValue(selectedValue);
                    }
                    handleChange(selectedValue);
                }}
                onSearch={handleInputChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onInputKeyDown={(e) => {
                    if (e.key === 'Enter' && inputValue && inputValue.trim()) {
                        handleChange(inputValue);
                    }
                }}
                options={options}
                showSearch={true}
                allowClear={true}
                filterOption={(input, option) => {
                    if (!option) return false;
                    const searchText = (option as any).searchText || '';
                    return searchText.toLowerCase().includes(input.toLowerCase());
                }}
                notFoundContent={notFoundContent}
                className={className}
                style={{ flex: 1 }}
            />
        );
    };

    return (
        <>
            {renderSelector()}
            {loadError && <Alert message={loadError} type="error" showIcon />}
            {(loading || isHandling) && (
                <Flex justify="center" align="center" style={{ width: '100%', height: '200px' }}>
                    <Spin />
                </Flex>
            )}
        </>
    );
}